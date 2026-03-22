# lucus

Lucus is a local files server which aims to replace image storage and other types of content in local and development environments. Lucus's ease of use lies in the fact that it serves the file system while respecting the folder structure, and includes functionalities on top of that.

## Features

- Serves complete file systems, including folders
- Auto-generated directory indexes (optional)
- Query parameters for image transformations
- Streaming long files

## Usage

### CLI

You can directly run lucus as a command-line tool

```sh
npx lucus ~/My-folder --port=3210 --directory-listing | npx pino-pretty
```

You can also run it using the provided `Dockerfile` and `docker-compose` configuration

```sh
git clone https://github.com/aitorllj93/lucus.git

# create .env to provide some configuration

docker compose up
```