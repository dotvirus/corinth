<p align="center">
   <img width="150" src="https://raw.githubusercontent.com/marvin-j97/corinth/dev/assets/favicon.png" alt="Logo">
</p>

<h1 align="center">Corinth</h1>

<p align="center">
  <img src="https://github.com/marvin-j97/corinth/workflows/Unit%20tests/badge.svg" alt="Build Status">
  <img alt="Docker Cloud Automated build" src="https://img.shields.io/docker/cloud/automated/dotvirus/corinth">
  <img alt="Docker Cloud Build Status" src="https://img.shields.io/docker/cloud/build/dotvirus/corinth">
  <img alt="GitHub issues" src="https://img.shields.io/github/issues-raw/marvin-j97/corinth">
</p>

**Corinth** is a simple and portable message queue server written in Rust.

### Features

- FIFO (strict message order, exactly-once delivery)
- file system persistence (AOF .jsonl format)
- explicit message acknowledgment (*ack*)
- message deduplication
- Dead-letter queues (DLQ)
- Optional queue maximum size
- JSON REST API

### Run

Grab a pre-compiled binary (https://github.com/marvin-j97/corinth/releases).

If you're using an OS other than Windows, Linux, Mac you'll have to [build a binary yourself](#build-from-source).
Run:

```
(Unix)
./corinth-[version]

(Windows)
corinth-[version].exe
.\corinth-[version].exe
```

That's it. By default the server runs on port 44444.

By using environment variables, you can change some settings:

| Name                     | Description                            | Default    |
| ------------------------ | -------------------------------------- | ---------- |
| CORINTH_PORT             | Port the server runs on                | 44444      |
| CORINTH_BASE_FOLDER      | Folder where persistent data is stored | ./.corinth |
| CORINTH_COMPACT_INTERVAL | Compaction interval (in seconds)       | 86400      |

### API Documentation

See https://marvin-j97.github.io/corinth/api/.

### Getting started

Create a queue named 'my-queue'. Queues are persistent by default.

```
curl -X PUT http://localhost:44444/queue/my-queue
```

Enqueue an item to queue ('item' can be any JSON object)

```
curl -X POST http://localhost:44444/queue/my-queue/enqueue -H "Content-Type: application/json" --data "{ \"messages\": [{ \"item\": { \"name\": \"My item\" }, \"deduplication\": null }] }"
```

Dequeue item from queue

```
curl -X POST http://localhost:44444/queue/my-queue/dequeue
```

By default, messages need to be acknowledged, otherwise they will be requeued after a specific timeout. If you don't care about acknowledging, you can acknowledge on dequeuing instead:

```
curl -X POST http://localhost:44444/queue/my-queue/dequeue?ack=true
```

Acknowledge message reception

```
curl -X POST http://localhost:44444/queue/my-queue/[message id]/ack
```

### Build from source

```
cargo build --release
```

### Docker

https://hub.docker.com/r/dotvirus/corinth

```
docker pull dotvirus/corinth
```

Build the image

```
docker build -t corinth .
```

Where `corinth` is the name of the image you are about to create.

Running a new container using the image

```
docker run -d -it -p 127.0.0.1:8080:44444 --rm --name corinth-queue corinth
```

To verify if everything worked, open up a browser and enter `localhost:8080`

#### Change application port

Use the CORINTH_PORT variable to change the port Corinth will bind to.

```
docker run -d -it -p 127.0.0.1:8080:22222 --env CORINTH_PORT=22222 --rm --name corinth-queue corinth
```

#### Docker Persistence

To create a persistent queue within Docker you need to mount a volume and make sure to correctly set the CORINTH_BASE_FOLDER environment variable.

```
docker run -d -it --env CORINTH_BASE_FOLDER=/corinth/.corinth -p 127.0.0.1:8080:44444 --mount source=corinthvol,target=/corinth --rm --name corinth-queue corinth
```

Pay attention to the `--mount` command. This will create a volume and mount it to your Docker container as '/corinth'. In this example, Corinth will store its persistence in the .corinth folder (/corinth/.corinth).

You can inspect the volume details using

```
docker volume inspect corinthvol
```

For more details on Docker volumes, check out the [official docs here](https://docs.docker.com/storage/volumes/#start-a-container-with-a-volume).

### Node.js client

https://github.com/marvin-j97/corinth.js
