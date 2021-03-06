// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const domain = "https://api.trello.com/1/";
const key = "e87cdfdeabab33fd2824771a0ca38bb0";
const token =
  "e8b2fac11f192ecc6bb28437bbfb7d052130f5c921bfbb03fd3f9975e49813f7";
const requiredParam = `?key=${key}&token=${token}`;
const boardId = "5f14457b33a4275b58d553a4";

const _ = require("lodash");
const moment = require("moment");
const axios = require("axios");
const schedule = require("node-schedule");
const path = require("path");
const dotenv = require("dotenv");
// Import required bot configuration.
const ENV_FILE = path.join(__dirname, ".env");
dotenv.config({ path: ENV_FILE });

const restify = require("restify");

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const {
  BotFrameworkAdapter,
  TurnContext,
  MessageFactory,
} = require("botbuilder");

// This bot's main dialog.
const { MyBot } = require("./bot");

// Create HTTP server
const server = restify.createServer();
server.use(
  restify.plugins.queryParser({
    mapParams: true,
  })
);
server.use(
  restify.plugins.bodyParser({
    mapParams: true,
  })
);
server.use(restify.plugins.acceptParser(server.acceptable));

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(
    "\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator"
  );
  console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights.
  console.error(`\n [onTurnError] unhandled error: ${error}`);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  // Send a message to the user
  await context.sendActivity("The bot encountered an error or bug.");
  await context.sendActivity(`${error}`);
  await context.sendActivity(
    "To continue to run this bot, please fix the bot source code."
  );
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
var MongoClient = require("mongodb").MongoClient;
const password = encodeURIComponent("Admin@123");
var url = `mongodb://admin:${password}@yunie.cf:27017/admin`;

var conversationReferences = {};

const myBot = new MyBot(conversationReferences);

// Listen for incoming requests.
server.post("/api/messages", (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    // Route to main dialog.
    await myBot.run(context);
  });
});

// Listen for Upgrade requests for Streaming.
server.on("upgrade", (req, socket, head) => {
  // Create an adapter scoped to this WebSocket connection to allow storing session data.
  const streamingAdapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
  });
  // Set onTurnError for the BotFrameworkAdapter created for each connection.
  streamingAdapter.onTurnError = onTurnErrorHandler;

  streamingAdapter.useWebSocket(req, socket, head, async (context) => {
    // After connecting via WebSocket, run this logic for every request sent over
    // the WebSocket connection.
    await myBot.run(context);
  });
});

function sendConfirm(res, msg) {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.write(`<html><body><h1>${msg}</h1></body></html>`);
  res.end();
}

function sendResponse(res, msg) {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.write(`${msg}`);
  res.end();
}

server.post("/api/notify", async (req, res) => {
  // Use the adapter to process the incoming web request into a TurnContext object.
  adapter.processActivity(req, res, async (turnContext) => {
    let tempConversationReference = await TurnContext.getConversationReference(
      turnContext.activity
    );
    reminder(tempConversationReference);
  });
});

const reminder = (tempconversationReference) => {
  // set rule // 8 AM every day
  // const rule = "*/10 * * * * *";
  const rule = "0 */5 * * * *";

  // const jobNames = _.keys(schedule.scheduledJobs);
  // console.log(jobNames);
  // if (jobNames.length > 0) for (let name of jobNames) schedule.cancelJob(name);
  // j.reschedule(rule);
  schedule.scheduleJob(rule, async (e) => {
    let hour = e.getHours();
    let minute = e.getMinutes();
    let second = e.getSeconds();
    let day = e.getDay(); // day of week
    let date = e.getDate(); // date of month
    console.log("Reminder!!");
    let conversationReference = tempconversationReference;
    if (hour === 1 && minute === 0 && second === 0) {
      // if (true) {
      await adapter.continueConversation(
        conversationReference,
        async (turnContext) => {
          let members = await getData("members");
          let lists = await getData("lists");
          let cardList = await getData("cards");
          let contextText = await renderText(
            members,
            lists,
            cardList,
            day,
            date
          );
          await turnContext.sendActivity(MessageFactory.text(contextText));
        }
      );
    }
  });
};

const getData = async (type) => {
  let res = await axios.get(
    `${domain}boards/${boardId}/${type}${requiredParam}`
  );
  return res.data || [];
};

const renderSubtext = (type, length) => {
  const texts = {
    "Hàng ngày": "trong ngày",
    "Cuối tuần": "cuối tuần",
    "Hàng tháng": "cuối tháng",
    "Theo kế hoạch": "theo kế hoạch",
  };
  return `Các tasks ${texts[type]}:${length > 0 ? "\n\n\u200C" : ""}`;
};

const renderText = async (members, lists, cardList, day, date) => {
  let routine = [
    { title: "Hàng ngày", type: 1 },
    { title: "Cuối tuần", type: 2 },
    { title: "Hàng tháng", type: 3 },
    { title: "Theo kế hoạch", type: 3 },
  ];
  routine = day !== 5 ? routine.filter((_) => _.type !== 2) : routine;

  let text = "";

  routine.forEach((item) => {
    let contextText = "";
    let cards = [];
    let list = {};

    lists.forEach((e) => {
      if (e.name == item.title) {
        list = e;
      }
    });

    cardList.forEach((e) => {
      cards = e.idList === list.id ? [...cards, e] : [...cards];
    });

    cards = cards.filter((e) => {
      // console.log(e.due);
      let now = new Date().getTime();
      let due = new Date(e.due).getTime();
      let timeToDue = (due - now) / (1000 * 60 * 60 * 24);
      // console.log(timeToDue);
      // console.log(+timeToDue <= 5);
      if (item.type === 3)
        return e.due !== null && timeToDue <= 5 && timeToDue >= 0;
      return e;
    });

    contextText =
      cards.length === 0 ? "" : renderSubtext(item.title, cards.length);

    cards = cards.map((e) => ({
      ...e,
      idMembers: e.idMembers.map((_) => ({ id: _ })),
    }));

    cards.length > 0 &&
      cards.forEach((e) => {
        e.idMembers.forEach((m) => {
          members.forEach((k) => {
            if (k.id === m.id) {
              m.username = k.username;
              m.fullName = k.fullName;
            }
          });
        });
      });

    // console.log(cards);

    cards.length > 0 &&
      cards.forEach((e, index) => {
        let taskName = `   - ${e.name}`;
        let taskMember = "";
        e.idMembers.forEach((k, i) => {
          taskMember = `${taskMember}${
            e.idMembers.length > 1 && i !== 0 ? " ," : ""
          } ${k.fullName}`;
        });
        let line = `${taskName} (${moment(e.due).format(
          "HH:MM DD/MM/YYYY"
        )}): ${taskMember}${cards.length > 1 ? "\n\n\u200C" : ""}`;
        contextText = `${contextText} ${line}`;
      });
    // console.log(contextText);
    text = `${text}${contextText}`;
  });
  // console.log(text);

  return text;
};

// az ad app create --display-name "Shin-bot" --password "01216266317Aa" --available-to-other-tenants

//az deployment sub create --template-file "./deploymentTemplates/template-with-new-rg.json" --location southeastasia --parameters appId="a253cc85-8932-4407-a940-c57cd81969b8" appSecret="01216266317Aa" botId="Shin-bot" botSku=F0 newAppServicePlanName="shin-service" newWebAppName="shin-bot-web" groupName="Shin" groupLocation="eastus" newAppServicePlanLocation="southeastasia" --name "shin-service"

//az webapp deployment source config-zip --resource-group "Shin" --name "shin-bot-web" --src "shin.zip"
