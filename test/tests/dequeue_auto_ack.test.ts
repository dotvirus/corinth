import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
const axiosConfig = {
  ...NO_FAIL(),
  params: {
    ack: true,
  },
};

ava.serial("Dequeue queue head -> no queue", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(404),
          data: yxc.object({
            error: yxc.boolean().true(),
            message: yxc.string().equals("Queue not found"),
            status: yxc.number().equals(404),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Create volatile queue", async (t) => {
  await createQueue(queueName, NO_FAIL());
  t.pass();
});

ava.serial("Dequeue queue head -> empty queue", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(Message()).len(0),
              num_items: yxc.number().equals(0),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

const item0 = {
  description: "This is a test object!",
};

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: item0,
          deduplication_id: null,
        },
      ],
    },
    axiosConfig
  );
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(202),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(202),
            result: yxc.object({
              items: yxc.array(Message()).len(1),
              num_enqueued: yxc.number().equals(1),
              num_deduplicated: yxc.number().equals(0),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("1 item should be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Queue info retrieved successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().equals(queueName),
                created_at: yxc.number().integer(),
                size: yxc.number().equals(1),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Dequeue queue head -> item0", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(
                Message(
                  yxc.object({
                    description: yxc.string().equals("This is a test object!"),
                  })
                )
              ),
              num_items: yxc.number().equals(1),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Queue should be empty again", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Queue info retrieved successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().equals(queueName),
                created_at: yxc.number().integer(),
                size: yxc.number().equals(0),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(1),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Dequeue queue head -> empty queue again", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(Message()).len(0),
              num_items: yxc.number().equals(0),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});
