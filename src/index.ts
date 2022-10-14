import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";
import config from "./config.json" assert { type: "json" };
import rules from "./rules.json" assert { type: "json" };
import { request, FormData } from "undici";
import BodyReadable from "undici/types/readable";

process.on("SIGINT", function () {
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

    let fileIndex = 0;
    let formData = new FormData();

    formData.append("payload_json", JSON.stringify({ content: (tweet.text || tweet.full_text)?.replace(/https:(\/\/t\.co\/([A-Za-z0-9]|[A-Za-z]){10})/, "") }));

    for (let media of tweet.extended_entities?.media ?? []) {
        if (media.type !== "video" && media.type !== "photo")
            continue;
        try {
            let photoVideo: { type: string, data: BodyReadable };
            switch (media.type) {
                case "video":
                    let bitrate = Math.max(...media.video_info!.variants.map(v => v.bitrate ?? 0));
                    let variants = media.video_info!.variants.filter(v =>
                        v.content_type == "video/mp4"
                        && v.url !== undefined
                        && v.bitrate == bitrate);
                    console.log("Downloading video", variants[0].url);
                    photoVideo = { type: "mp4", data: await request(variants[0].url).then(r => r.body), };
                    break;
                case "photo":
                    console.log("Downloading photo", media.media_url_https);
                    photoVideo = { type: "jpg", data: await request(media.media_url_https).then(r => r.body) };
                    break;
                default:
                    throw new Error("Unknown media type");
            }
            formData.append(`file${fileIndex.toString()}`, await photoVideo.data.blob(), `nxr_${tweet.id_str}.${photoVideo.type}`);
        } catch (e) {
            console.log(e);
        }
        fileIndex++;
    }

    logDebug(formData);
    request(config.webhookUrl, {
        method: "POST",
        body: formData
    });
}

function logDebug(info: any, ...args: any) {
    if (config.logDebug)
        console.log(info, args);
}

// TODO add authenticated users eventually

