import { TweetV1 } from "twitter-api-v2";
import { request, FormData } from "undici";
import BodyReadable from "undici/types/readable";
import { logDebug, config }  from ".";

async function uploadVideo(tweet: TweetV1) {
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
    try {
        request(config.webhookUrl, {
            method: "POST",
            body: formData
        });   
    } catch (error) {
        console.error(error);
    }
}

export default uploadVideo;
