use crate::queue::Message;
use crate::date::elapsed_secs;
use crate::date::{iso_date, timestamp};
use crate::global_data::{queue_exists, QUEUES};
use crate::nickel::QueryString;
use crate::queue::Queue;
use crate::response::{error, success};
use nickel::status::StatusCode;
use nickel::{HttpRouter, JsonBody, Nickel};
use serde_json::{json, Value};
use std::time::Instant;

#[derive(Serialize, Deserialize)]
struct NewItem {
  item: Value,
  deduplication_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  messages: Vec<NewItem>,
}

pub fn create_server() -> Nickel {
  let mut server = Nickel::new();
  let start_time = Instant::now();

  // Logger middleware
  server.utilize(middleware! { |req|
    println!("{} {}: {}", req.origin.method.to_string(), req.origin.uri.to_string(), iso_date());
  });

  // Get server info
  server.get(
    "/",
    middleware! { |_req, mut res|
      let now = timestamp();
      let uptime_secs = elapsed_secs(start_time);
      success(&mut res, StatusCode::Ok, json!({
        "info": {
          "name": String::from("Corinth"),
          "version": String::from("0.0.1"),
          "uptime_ms": uptime_secs * 1000,
          "uptime_secs": uptime_secs,
          "started_at": now - uptime_secs,
        }
      }), String::from("Info retrieved successfully"))
    },
  );

  // List queues
  server.get(
    "/queues",
    middleware! { |_req, mut res|
      let queue_map = QUEUES.lock().unwrap();
      let mut queue_names: Vec<String> = queue_map.keys().map(|key| key.clone()).collect();
      queue_names.sort();
      success(&mut res, StatusCode::Ok, json!({
        "queues": {
          "items": queue_names,
          "length": queue_names.len(),
        }
      }), String::from("Queue list retrieved successfully"))
    },
  );

  // Get queue info
  server.get(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let queue_name = String::from(req.param("queue_name").unwrap());
        let queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get(&queue_name).unwrap();
        success(&mut res, StatusCode::Ok, json!({
          "queue": {
            "name": queue_name,
            "created_at": queue.created_at(),
            "size": queue.size(),
            "num_deduped": queue.dedup_size(),
            "num_unacked": queue.ack_size(),
            "num_acknowledged": queue.num_acknowledged(),
            "num_dedup_hits": queue.num_dedup_hits(),
            "dedup_time": queue.dedup_time(),
            "ack_time": queue.ack_time(),
          }
        }), String::from("Queue info retrieved successfully"))
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  server.post(
    "/queue/:queue_name/enqueue",
    middleware! { |req, mut res|
      let body = try_with!(res, {
        req.json_as::<EnqueueBody>().map_err(|e| (StatusCode::BadRequest, e))
      });

      let mut all_objects = true;

      for item in body.messages.iter() {
        if !item.item.is_object() {
          all_objects = false;
        }
      }
      
      if all_objects {
        let queue_name = String::from(req.param("queue_name").unwrap());

        if !queue_exists(req) {
          let create_queue = req.query().get("create_queue");
          let create_queue_as_string = if create_queue.is_some() { Some(String::from(create_queue.unwrap())) } else { None };
          if create_queue.is_some() && create_queue_as_string.unwrap() == "true" {
            let mut queue_map = QUEUES.lock().unwrap();
            queue_map.insert(queue_name.clone(), Queue::new(queue_name.clone(), 300, 300));
          }
          else {
            return res.error(StatusCode::NotFound, "Queue not found");
          }
        }

        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&queue_name).unwrap();

        let mut num_enqueued = 0;

        for item in body.messages.iter() {
          let dup_item = item.clone();
          let dedup_id = dup_item.deduplication_id.clone();
          let dedup_id_as_string = if dedup_id.is_some() { Some(String::from(dedup_id.clone().unwrap())) } else { None };
          let msg = queue.try_enqueue(dup_item.item.clone(), dedup_id_as_string);
          if msg.is_some() {
            num_enqueued += 1;
          }
        }
        
        success(&mut res, StatusCode::Ok, json!({
          "num_enqueued": num_enqueued,
        }), String::from("Request processed"))
      }
      else {
        error(&mut res, StatusCode::BadRequest, "body.items is required to be of type Array<Object>")
      }
    },
  );

  server.post(
    "/queue/:queue_name/dequeue",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();

        let query = req.query();
        let auto_ack = query.get("ack");
        let num_to_dequeue = query.get("amount").unwrap_or("1").parse::<u8>().map_err(|e| (StatusCode::BadRequest, e));
        let max = num_to_dequeue.unwrap();
        
        let mut dequeued_items: Vec<Message> = Vec::new();
        
        let mut i = 0;

        while i < max {
          let message = queue.dequeue(false, auto_ack.is_some() && auto_ack.unwrap() == "true");
          if message.is_some() {
            dequeued_items.push(message.unwrap());
            i += 1;
          }
          else {
            break;
          }
        }

        success(&mut res, StatusCode::Ok, json!({
          "items": dequeued_items,
        }), String::from("Messages retrieved successfully"))
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  server.get(
    "/queue/:queue_name/peek",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();
        let message = queue.dequeue(true, false);
        if message.is_some() {
          success(&mut res, StatusCode::Ok, json!({
            "item": message.unwrap()
          }), String::from("Message retrieved successfully"))
        }
        else {
          success(&mut res, StatusCode::Ok, json!(null), String::from("Queue is empty"))
        }
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  server.put(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      if queue_exists(req) {
        error(&mut res, StatusCode::Conflict, "Queue already exists")
      }
      else {
        let query = req.query();
        let ack_time_str = query.get("ack_time").unwrap_or("300");
        let dedup_time_str = query.get("dedup_time").unwrap_or("300");
        let ack_time_result = ack_time_str.parse::<u32>().ok();
        let dedup_time_result = dedup_time_str.parse::<u32>().ok();

        if ack_time_result.is_none() || dedup_time_result.is_none() {
          return res.error(StatusCode::BadRequest, "Invalid time argument");
        }

        let mut queue_map = QUEUES.lock().unwrap();
        let queue_name = String::from(req.param("queue_name").unwrap());

        queue_map.insert(queue_name.clone(), Queue::new(queue_name, ack_time_result.unwrap(), dedup_time_result.unwrap()));
        success(&mut res, StatusCode::Created, json!(null), String::from("Queue created successfully"))
      }
    },
  );

  server
}
