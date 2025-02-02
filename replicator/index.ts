import cors = require("cors");
import express = require("express");
import * as http from "http";
import { JinagaServer } from "../src";
import process = require("process");

process.on('SIGINT', () => {
  console.log("\n\nStopping replicator\n");
  process.exit(0);
});

const app = express();
const server = http.createServer(app);

app.set('port', process.env.PORT || 8080);
app.use(express.json());
app.use(express.text());
app.use(cors());

const pgConnection = process.env.JINAGA_POSTGRESQL ||
  'postgresql://raasuser:raaspw@localhost:5432/raas';
const { handler } = JinagaServer.create({
  pgStore: pgConnection
});

app.use('/jinaga', handler);

server.listen(app.get('port'), () => {
  console.log(`  Replicator is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`);
  console.log('  Press CTRL-C to stop\n');
});
