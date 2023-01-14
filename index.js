import { createClient } from "redis";
import {
  createApp,
  eventHandler,
  toNodeListener,
  readBody,
  createRouter,
  send,
  sendError,
  getRouterParams,
} from "h3";
import { listen } from "listhen";
const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

const app = createApp();
const router = createRouter()
  .post(
    "/ping",
    eventHandler(async (event) => {
      let body = await readBody(event);
      if (!body.username) return sendError(event);
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
      const value = await client.get(key);
      console.log(value)
      return {online: (value == 'true' || false)};
    })
  );

app.use(router);

listen(toNodeListener(app));