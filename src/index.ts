import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";
import config from "../config.json";
import rules from "../rules.json";
import uploadVideo from "./media";

async function start() {
    process.on("SIGINT", () =>{
        console.log("Closing stream and exiting");
        stream.close();
        process.exit();
    });

    const client = new TwitterApi(config.token);
    console.log("Starting twitter connection");

    const stream = await client.v2.searchStream();
    stream.autoReconnect = config.autoReconnect;


    stream.on(ETwitterStreamEvent.ConnectionError, e => {
        console.log("Connection error:", e);
        stream.close();
        process.exit(1);
    });
    stream.on(ETwitterStreamEvent.Error, e => {
        console.log("Twitter error:", e);
        if (e.message?.toString().includes("Connection closed by Twitter")) {
            stream.close();
            process.exit(1);
        };
    });

    await client.v2.updateStreamRules({
        add: [
            ...rules
        ]
    });
    for await (const { data } of stream) {
        let tweet = await client.v1.singleTweet(data.id);
        logDebug(tweet);
        if (config.checkSource && !tweet.source.includes("Nintendo Switch Share")) {
            console.log(`Tweet source of ${tweet.id_str} doesn't match, ignoring`);
            continue;
        }

        uploadVideo(tweet);
    }
}

function logDebug(info: any, ...args: any) {
    if (config.logDebug)
        console.log(info, args);
}

start();
export { logDebug, config };

// TODO add authenticated users eventually
