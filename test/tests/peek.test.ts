import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import {
  queueUrl as getQueueUrl,
  createQueue,
  validateEmptyQueueResponse,
} from "../common";

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);
const peekUrl = queueUrl + "/peek";
const axiosConfig = NO_FAIL();

ava.serial("Peek queue head -> no queue", async (t) => {
  const res = await Axios.get(peekUrl, axiosConfig);
  t.is(res.status, 404);
  t.deepEqual(res.data, {
    error: true,
    message: "Queue not found",
  });
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, axiosConfig);
  t.is(res.status, 201);
  t.is(res.data.message, "Queue created successfully");
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res);
});

ava.serial("Peek queue head -> empty queue", async (t) => {
  const res = await Axios.get(peekUrl, axiosConfig);
  t.is(res.status, 200);
  t.deepEqual(res.data, {
    message: "Queue is empty",
    result: null,
  });
});

const item0 = {
  description: "This is a test object!",
};

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      item: item0,
    },
    axiosConfig
  );
  t.is(res.status, 201);
  t.is(typeof res.data.result, "object");
  t.is(res.data.message, "Message has been enqueued successfully");
  t.is(typeof res.data.result.item, "object");
  t.is(typeof res.data.result.item.id, "string");
  t.is(typeof res.data.result.item.queued_at, "number");
  t.deepEqual(res.data.result.item.item, item0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.item).length, 3);
});

ava.serial("1 item should be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});

ava.serial("Peek queue head -> item0", async (t) => {
  const res = await Axios.get(peekUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result.item, "object");
  t.is(typeof res.data.result.item.id, "string");
  t.is(typeof res.data.result.item.queued_at, "number");
  t.deepEqual(res.data.result.item.item, item0);
});

ava.serial("1 item should still be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});

const item1 = {
  description: "This is a test object 2!",
};

ava.serial("Enqueue item again", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      item: item1,
    },
    axiosConfig
  );
  t.is(res.status, 201);
  t.is(typeof res.data.result, "object");
  t.is(res.data.message, "Message has been enqueued successfully");
  t.is(typeof res.data.result.item, "object");
  t.is(typeof res.data.result.item.id, "string");
  t.is(typeof res.data.result.item.queued_at, "number");
  t.deepEqual(res.data.result.item.item, item1);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.item).length, 3);
});

ava.serial("2 items should be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 2);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});

ava.serial("Peek queue head again -> item0", async (t) => {
  const res = await Axios.get(peekUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result.item, "object");
  t.is(typeof res.data.result.item.id, "string");
  t.is(typeof res.data.result.item.queued_at, "number");
  t.deepEqual(res.data.result.item.item, item0);
});

ava.serial("2 items should still be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 2);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});
