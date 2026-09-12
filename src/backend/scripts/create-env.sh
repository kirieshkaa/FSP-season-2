#!/usr/bin/env bash

ENV_FILE=".env"
ENV_EMPTY=".env.empty"

if [ -f "$ENV_FILE" ]; then
  echo "ENV file already exists"
  exit
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "file $ENV_EMPTY not found"
  exit
fi

cp .env.example .env

echo "empty .env file created"
