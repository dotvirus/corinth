import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";

spawnCorinth();

const queueName = "new_queue";
const axiosConfig = NO_FAIL();
const queueUrl = getQueueUrl(queueName);
const testItem = {
  description: "This is a test object!",
};
const reqBody = {
  messages: [
    {
      item: testItem,
      deduplication_id: "i5joaibj5oiwj5",
    },
  ],
};

ava.serial("Enqueue item to non-existing queue", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([404]),
          // data: yxc.object({
          //   error: yxc.boolean().true(),
          //   message: yxc.string().enum(["Queue not found"]),
          // }), // TODO: ???
          data: yxc.string().enum(["Not Found"]),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL());
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([201]),
          data: yxc.object({
            message: yxc.string().enum(["Queue created successfully"]),
            result: yxc
              .any()
              .nullable()
              .use((v) => v === null),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Queue info retrieved successfully"]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([0]),
                num_deduped: yxc.number().enum([0]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                dedup_time: yxc.number().enum([300]),
                ack_time: yxc.number().enum([300]),
                persistent: yxc.boolean().false(),
                mem_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([202]),
          data: yxc.object({
            message: yxc.string().enum(["Request processed successfully"]),
            result: yxc.object({
              items: yxc.array(Message()).len(1),
              num_enqueued: yxc.number().enum([1]),
              num_deduplicated: yxc.number().enum([0]),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("1 item should be queued", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Queue info retrieved successfully"]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([1]),
                num_deduped: yxc.number().enum([1]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                dedup_time: yxc.number().enum([300]),
                ack_time: yxc.number().enum([300]),
                persistent: yxc.boolean().false(),
                mem_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

const NUM_ITEMS = 10;

ava.serial(`Enqueue ${NUM_ITEMS} items`, async (t) => {
  for (let i = 0; i < NUM_ITEMS; i++) {
    const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
    t.deepEqual(
      createExecutableSchema(
        yxc
          .object({
            status: yxc.number().enum([202]),
            data: yxc.object({
              message: yxc.string().enum(["Request processed successfully"]),
              result: yxc.object({
                items: yxc.array(Message()).len(0),
                num_enqueued: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([1]),
              }),
            }),
          })
          .arbitrary()
      )(res),
      []
    );
  }
});

ava.serial("1 item should be queued, still", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Queue info retrieved successfully"]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([1]),
                num_deduped: yxc.number().enum([1]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([NUM_ITEMS]),
                num_acknowledged: yxc.number().enum([0]),
                dedup_time: yxc.number().enum([300]),
                ack_time: yxc.number().enum([300]),
                persistent: yxc.boolean().false(),
                mem_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});
