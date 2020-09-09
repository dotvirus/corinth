import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import { queueUrl as getQueueUrl, Message } from "../common";
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
      deduplication_id: null,
    },
  ],
};

ava.serial("Create missing queue on enqueue", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, {
    ...axiosConfig,
    params: {
      create_queue: true,
      persistent_queue: false,
    },
  });
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([202]),
          data: yxc.object({
            message: yxc.string().enum(["Request processed successfully"]),
            status: yxc.number().enum([202]),
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
            status: yxc.number().enum([200]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([1]),
                num_deduplicating: yxc.number().enum([0]),
                num_unacknowledged: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([0]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([300]),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});
