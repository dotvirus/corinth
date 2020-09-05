use crate::date::iso_date;
use crate::global_data::{queue_exists, QUEUES};
use crate::queue::Message;
use crate::queue::Queue;
use crate::response::{format_error, format_success};
use nickel::status::StatusCode;
use nickel::MiddlewareResult;
use nickel::Request;
use nickel::{JsonBody, MediaType, QueryString, Response};
use serde_json::{json, Value};
use std::path::Path;

#[derive(Serialize, Deserialize)]
struct NewItem {
  item: Value,
  deduplication_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  messages: Vec<NewItem>,
}

pub fn logger<'mw>(req: &mut Request, res: Response<'mw>) -> MiddlewareResult<'mw> {
  println!(
    "{} {}: {}",
    req.origin.method.to_string(),
    req.origin.uri.to_string(),
    iso_date()
  );
  res.next_middleware()
}

pub fn favicon_handler<'a, D>(_: &mut Request<D>, res: Response<'a, D>) -> MiddlewareResult<'a, D> {
  // https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html#foreground.type=clipart&foreground.clipart=settings_ethernet&foreground.space.trim=1&foreground.space.pad=0.45&foreColor=rgb(108%2C%20100%2C%2059)&backColor=rgb(231%2C%20216%2C%20139)&crop=0&backgroundShape=circle&effects=score&name=ic_launcher
  let favicon = Path::new("assets/favicon.png");
  res.send_file(favicon)
}

pub fn peek_handler<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map
      .get_mut(&String::from(req.param("queue_name").unwrap()))
      .unwrap();
    let message = queue.peek();
    if message.is_some() {
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Message retrieved successfully"),
        json!({
          "item": message.unwrap()
        }),
      ));
    } else {
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Queue is empty"),
        json!({ "item": null }),
      ));
    }
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn dequeue_handler<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map
      .get_mut(&String::from(req.param("queue_name").unwrap()))
      .unwrap();

    let query = req.query();
    let auto_ack = query.get("ack").unwrap_or("false");
    let num_to_dequeue = query
      .get("amount")
      .unwrap_or("1")
      .parse::<u8>()
      .map_err(|e| (StatusCode::BadRequest, e));
    let max = num_to_dequeue.unwrap();

    if max < 1 {
      res.set(MediaType::Json);
      res.set(StatusCode::NotFound);
      return res.send(format_error(
        StatusCode::NotFound,
        String::from("Invalid amount parameter"),
      ));
    } else {
      let mut dequeued_items: Vec<Message> = Vec::new();
      let mut i = 0;

      while i < max {
        let message = queue.dequeue(auto_ack == "true");
        if message.is_some() {
          dequeued_items.push(message.unwrap());
          i += 1;
        } else {
          break;
        }
      }

      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Request processed successfully"),
        json!({
          "items": dequeued_items,
          "num_items": dequeued_items.len(),
        }),
      ));
    }
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn enqueue_handler<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  let body = try_with!(res, {
    req
      .json_as::<EnqueueBody>()
      .map_err(|e| (StatusCode::BadRequest, e))
  });

  let mut all_objects = true;

  for item in body.messages.iter() {
    if !item.item.is_object() {
      all_objects = false;
    }
  }
  if all_objects && body.messages.len() < 256 {
    let queue_name = String::from(req.param("queue_name").unwrap());

    if !queue_exists(req) {
      let query = req.query();
      let create_queue = query.get("create_queue");
      if create_queue.is_some() && create_queue.unwrap_or("false") == "true" {
        let persistent = query.get("persistent_queue").unwrap_or("false") == "true";
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = Queue::new(queue_name.clone(), 300, 300, persistent);
        queue_map.insert(queue_name.clone(), queue);
      } else {
        res.set(MediaType::Json);
        res.set(StatusCode::NotFound);
        return res.send(format_error(
          StatusCode::NotFound,
          String::from("Queue not found"),
        ));
      }
    }

    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();

    let mut enqueued_items: Vec<Message> = Vec::new();
    let mut num_deduplicated = 0;

    for item in body.messages.iter() {
      let dup_item = item.clone();
      let dedup_id = dup_item.deduplication_id.clone();
      let dedup_id_as_string = if dedup_id.is_some() {
        Some(String::from(dedup_id.clone().unwrap()))
      } else {
        None
      };
      let msg = queue.try_enqueue(dup_item.item.clone(), dedup_id_as_string);
      if msg.is_some() {
        enqueued_items.push(msg.unwrap());
      } else {
        num_deduplicated += 1;
      }
    }

    res.set(MediaType::Json);
    res.set(StatusCode::Accepted);
    return res.send(format_success(
      StatusCode::Accepted,
      String::from("Request processed successfully"),
      json!({
        "num_enqueued": enqueued_items.len(),
        "num_deduplicated": num_deduplicated,
        "items": enqueued_items
      }),
    ));
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::BadRequest);
    return res.send(format_error(
      StatusCode::BadRequest,
      String::from("body.items is required to be of type Array<Object> with at most 255 items"),
    ));
  }
}

pub fn ack_message<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map
      .get_mut(&String::from(req.param("queue_name").unwrap()))
      .unwrap();
    let ack_result = queue.ack(req.param("message").unwrap().into());
    if ack_result {
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Message reception acknowledged"),
        json!(null),
      ));
    } else {
      res.set(MediaType::Json);
      res.set(StatusCode::NotFound);
      return res.send(format_error(
        StatusCode::NotFound,
        String::from("Message not found"),
      ));
    }
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn queue_info<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let queue_name = String::from(req.param("queue_name").unwrap());
    let queue_map = QUEUES.lock().unwrap();
    let queue = queue_map.get(&queue_name).unwrap();

    res.set(MediaType::Json);
    res.set(StatusCode::Ok);
    return res.send(format_success(
      StatusCode::Ok,
      String::from("Queue info retrieved successfully"),
      json!({
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
          "persistent": queue.is_persistent(),
          "mem_size": queue.get_mem_size(),
        }
      }),
    ));
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn list_queues<'mw>(_req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  let queue_map = QUEUES.lock().unwrap();
  let mut queue_names: Vec<String> = queue_map.keys().map(|key| key.clone()).collect();
  queue_names.sort();

  res.set(MediaType::Json);
  res.set(StatusCode::Ok);
  return res.send(format_success(
    StatusCode::Ok,
    String::from("Queue list retrieved successfully"),
    json!({
      "queues": {
        "items": queue_names,
        "length": queue_names.len(),
      }
    }),
  ));
}

pub fn create_queue_handler<'mw>(
  req: &mut Request,
  mut res: Response<'mw>,
) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    res.set(MediaType::Json);
    res.set(StatusCode::Conflict);
    return res.send(format_error(
      StatusCode::Conflict,
      String::from("Queue already exists"),
    ));
  } else {
    let queue_name = String::from(req.param("queue_name").unwrap());
    let query = req.query();
    let ack_time_str = query.get("ack_time").unwrap_or("300");
    let dedup_time_str = query.get("dedup_time").unwrap_or("300");
    let ack_time_result = ack_time_str.parse::<u32>().ok();
    let dedup_time_result = dedup_time_str.parse::<u32>().ok();
    let persistent = query.get("persistent").unwrap_or("false") == "true";

    if ack_time_result.is_none() || dedup_time_result.is_none() {
      res.set(MediaType::Json);
      res.set(StatusCode::BadRequest);
      return res.send(format_error(
        StatusCode::BadRequest,
        String::from("Invalid time argument"),
      ));
    }

    let mut queue_map = QUEUES.lock().unwrap();
    let queue = Queue::new(
      queue_name.clone(),
      ack_time_result.unwrap(),
      dedup_time_result.unwrap(),
      persistent,
    );
    queue_map.insert(queue_name, queue);

    res.set(MediaType::Json);
    res.set(StatusCode::Created);
    return res.send(format_success(
      StatusCode::Created,
      String::from("Queue created successfully"),
      json!(null),
    ));
  }
}
