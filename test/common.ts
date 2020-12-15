import { getUrl } from "./util";
import yxc from "@dotvirus/yxc";
import Axios, { AxiosRequestConfig } from "axios";

export enum MessageState {
  Pending = "Pending",
  Requeued = "Requeued",
  Failed = "Failed",
}

export const Message = (
  item = yxc.object().arbitrary(),
  num_requeues = yxc.number().natural({ withZero: true }),
  state = yxc.string().enum(Object.values(MessageState))
) =>
  yxc.object({
    id: yxc.string(),
    queued_at: yxc.number().natural(),
    updated_at: yxc.number().natural(),
    item,
    state,
    num_requeues,
  });

export function queueUri(name: string) {
  return `/queue/${name}`;
}

export function queueUrl(name: string) {
  return getUrl(queueUri(name));
}

export function createQueue(name: string, opts?: AxiosRequestConfig) {
  return Axios.put(queueUrl(name), null, {
    ...opts,
    params: {
      persistent: false,
      ...(opts?.params || {}),
    },
  });
}

export function deleteQueue(name: string) {
  return Axios.delete(queueUrl(name));
}
