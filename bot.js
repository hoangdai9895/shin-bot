// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, TurnContext, MessageFactory } = require("botbuilder");

class MyBot extends ActivityHandler {
  constructor(conversationReferences) {
    super();
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.conversationReferences = conversationReferences;
    console.log("log");
    console.log(this.conversationReferences);
    console.log(this.conversationReferences.length);
    this.onConversationUpdate(async (context, next) => {
      this.addConversationReference(context.activity);
      await next();
    });

    this.onMessage(async (context, next) => {
      let answer = context.activity.text;
      answer = this.removeMentionTag(answer);
      if (
        answer.includes("chào") ||
        answer.includes("hello") ||
        answer.includes("hi") ||
        answer.includes("Chào") ||
        answer.includes("Hello") ||
        answer.includes("Hi")
      ) {
        await context.sendActivity(`Chào ${context.activity.from.name}`);
      } else {
        await context.sendActivity(
          `Mình không tiếp chuyện với ${context.activity.from.name} đâu. Bạn đừng gọi tên mình nữa!`
        );
      }

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      const welcomeText = "Hello and welcome!";
      for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
        if (membersAdded[cnt].id !== context.activity.recipient.id) {
          await context.sendActivity(
            MessageFactory.text(welcomeText, welcomeText)
          );
        }
      }
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  addConversationReference(activity) {
    const conversationReference = TurnContext.getConversationReference(
      activity
    );
    this.conversationReferences[
      conversationReference.conversation.id
    ] = conversationReference;

    if (conversationReference.channelId !== "emulator") {
      var MongoClient = require("mongodb").MongoClient;
      const password = encodeURIComponent("Admin@123");
      var url = `mongodb://admin:${password}@yunie.cf:27017/admin`;

      MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
        if (err) throw err;
        var dbo = db.db("arale");
        dbo
          .collection("conversation_references")
          .insertOne(conversationReference, function (err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
          });
      });
    }
  }

  removeMentionTag(str) {
    if (str.indexOf("Puka") === 0) {
      var firstSpaceInx = str.indexOf(" ");
      return str.substring(firstSpaceInx + 1, str.length);
    } else {
      return str;
    }
  }
}

module.exports.MyBot = MyBot;
