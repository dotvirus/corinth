![Unit tests](https://github.com/dotvirus/corinth/workflows/Unit%20tests/badge.svg)

# Corinth

A portable message queue server with file system persistence (AOF .jsonl format) and an easy-to-use JSON REST API.

Other notable features include explicit message acknowledgment and message deduplication.

Written in stable, safe Rust, tested in Typescript.

## Run

Grab a pre-compiled binary (https://github.com/dotvirus/corinth/releases).

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

| Name                | Description                            | Default    |
| ------------------- | -------------------------------------- | ---------- |
| CORINTH_PORT        | Port the server runs on                | 44444      |
| CORINTH_BASE_FOLDER | Folder where persistent data is stored | ./.corinth |

## API Documentation

See https://dotvirus.github.io/corinth/api/.

## Getting started

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

## Build from source

```
cargo build --release
```

## Docker

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

### Docker Persistance

To create a persistant queue within Docker you need to mount a volume.

```
docker run -d -it --env CORINTH_PORT=22222 --env CORINTH_BASE_FOLDER=/app -p 127.0.0.1:8080:22222 --mount source=corinthvol,target=/app --rm --name queue-server corinth
```

Pay attention to the `--mount` command.

This will create a volume and mount it to your Docker container. You can inspect the volume details using

```
docker volume inspect corinthvol
```

For more details on Docker volumes, check out the [official docs here](https://docs.docker.com/storage/volumes/#start-a-container-with-a-volume).

## Roadmap

- See GitHub issues (https://github.com/dotvirus/corinth/issues)
- Node.js API wrapper package
