import { createClient } from "redis";
import {
  createApp,
  eventHandler,
  toNodeListener,
  readBody,
  createRouter,
  createError,
  sendError,
  getRouterParams,
} from "h3";
import { listen } from "listhen";
const client = createClient({url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

const app = createApp();
const router = createRouter()
  .post(
    "/ping",
    eventHandler(async (event) => {
      let body = await readBody(event);
      if (!body.username) return sendError(event,createError('test',) );
      let key = `user-${body.username}`;
      await client.set(key, "true");
      await client.expire(key, 5 * 60);
      return { success: true };
    })
  )
  .get(
    "/status/:name",
    eventHandler(async (event) => {
      const params = getRouterParams(event);
      let key = `user-${params.name}`;
      const online = !!await client.exists(key);
      return {online};
    })
  );

app.use(router);

listen(toNodeListener(app));