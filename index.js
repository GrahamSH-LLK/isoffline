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
import { defineCorsEventHandler } from "@nozomuikuta/h3-cors";
import { listen } from "listhen";
const client = createClient({
  url: `redis://${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`,
  password: process.env.REDIS_PW,
});

client.on("error", (err) => {
  console.log("Redis Client Error", err);
  process.exit(1);
});

await client.connect();

const app = createApp();
app.use(
  defineCorsEventHandler({
    /* options */
  })
);

const markAsUser = async (username) => {
  const alreadyMarked = !!(await client.exists(`${username}-exists`));
  if (!alreadyMarked) {
    await client.set(`${username}-exists`, "true");
  }
};

const router = createRouter()
  .post(
    "/ping",
    eventHandler(async (event) => {
      let body = await readBody(event);
      const username = body.username?.toLowerCase()
      if (!username) return sendError(event, createError({ status: 400 }));
      let key = `user-${username}`;
      await client.set(key, "true");
      await client.expire(key, 5 * 60);
      markAsUser(username);
      return { success: true };
    })
  )
  .get(
    "/status/:name",
    eventHandler(async (event) => {
      const params = getRouterParams(event);
      const username = params.name.toLowerCase();
      let key = `user-${username}`;
      const online = !!(await client.exists(key));
      if (!online) {
        const isUser = !!(await client.exists(`${username}-exists`));
        if (!isUser) {
          return sendError(event, createError({ status: 404 }));
        }
      }
      return { online };
    })
  );

app.use(router);

listen(toNodeListener(app));
