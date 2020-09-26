import ava, { before, after } from "ava";
import Axios from "axios";
import { getUrl, spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { createQueue } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

ava.serial("List queues", async (t) => {
  const names = ["asd", "peter", "hello", "paradise_circus", "test", "zzz"];
  for (const name of names) {
    await createQueue(name);
  }
  const res = await Axios.get(getUrl("/queues"), NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Queue list retrieved successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              queues: yxc.object({
                items: yxc.array(yxc.string()).len(names.length),
                length: yxc.number().equals(names.length),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  t.deepEqual(res.data.result.queues.items, names.slice().sort());
});
