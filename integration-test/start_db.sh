#!/bin/bash
docker run -d --name jinaga-postgres -p5432:5432 -e POSTGRES_PASSWORD=superuser -e APP_USERNAME=dev -e APP_PASSWORD=devpw -e APP_DATABASE=integrationtest jinaga-postgres-fact-keystore
