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
struct EnqueueBody {
  item: Value,
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
      }))
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
      }))
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
            "num_deduped": queue.deduped_size(),
            "num_done": queue.num_done(),
            "num_dedup_hits": queue.num_dedup_hits(),
          }
        }))
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
      
      if body.item.is_object() {        
        let queue_name = String::from(req.param("queue_name").unwrap());

        if !queue_exists(req) {
          let create_queue = req.query().get("create_queue");
          let create_queue_as_string = if create_queue.is_some() { Some(String::from(create_queue.unwrap())) } else { None };
          if create_queue.is_some() && create_queue_as_string.unwrap() == "true" {
            let mut queue_map = QUEUES.lock().unwrap();
            queue_map.insert(queue_name.clone(), Queue::new());
          }
          else {
            return res.error(StatusCode::NotFound, "Queue not found");
          }
        }

        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&queue_name).unwrap();
        let dedup_id = req.query().get("deduplication_id");
        let dedup_id_as_string = if dedup_id.is_some() { Some(String::from(dedup_id.unwrap())) } else { None };
        let msg = queue.try_enqueue(body.item, dedup_id_as_string);
        if msg.is_some() {
          // Enqueued message
          success(&mut res, StatusCode::Created, json!({
            "message": "Message has been enqueued",
            "item": msg.unwrap(),
          }))
        }
        else {
          // Message deduplicated
          success(&mut res, StatusCode::Accepted, json!({
            "message": "Message has been discarded"
          }))
        }
      }
      else {
        error(&mut res, StatusCode::BadRequest, "body.item is required to be of type 'object'")
      }
    },
  );

  server.delete(
    "/queue/:queue_name/dequeue",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();
        // TODO: check ?ack=true
        let message = queue.dequeue(false);
        if message.is_some() {
          success(&mut res, StatusCode::Ok, json!({
            "item": message.unwrap()
          }))
        }
        else {
          success(&mut res, StatusCode::Ok, json!(null))
        }
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
        let message = queue.dequeue(true);
        if message.is_some() {
          success(&mut res, StatusCode::Ok, json!({
            "item": message.unwrap()
          }))
        }
        else {
          success(&mut res, StatusCode::Ok, json!(null))
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
        let mut queue_map = QUEUES.lock().unwrap();
        let queue_name = String::from(req.param("queue_name").unwrap());
        queue_map.insert(queue_name, Queue::new());
        success(&mut res, StatusCode::Created, json!({
          "message": "Queue created"
        }))
      }
    },
  );

  server
}
