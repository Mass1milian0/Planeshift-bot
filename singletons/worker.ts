// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { Worker } from "node:worker_threads";
let worker: Worker;

function initWorker() {
  worker = new Worker("./messageSentry.ts");
}

function sendUpdate() {
  worker.postMessage({
    type: "CONFIG_UPDATE",
    content: "",
  });
}

export { worker as default, initWorker, sendUpdate };
