import { Blob } from "buffer";
import { TweetV1 } from "twitter-api-v2";
import { request, FormData } from "undici";
import BodyReadable from "undici/types/readable";
import { logDebug, config } from ".";
import { createFFmpeg } from "@ffmpeg/ffmpeg";

async function downloadMedia(tweet: TweetV1) {
    let fileIndex = 0;
    let formData = new FormData();

    logDebug(tweet.extended_entities!.media?.forEach(media => JSON.stringify(media.video_info)));

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
            let blob = await photoVideo.data.blob();
            if (blob.size < 8000000) {
                formData.append(`file${fileIndex.toString()}`, blob, `nxr_${tweet.id_str}.${photoVideo.type}`);
            } else {
                let newBlob = await compressVideo(tweet.id_str, blob);
                formData.append(`file${fileIndex.toString()}`, newBlob, `nxr_${tweet.id_str}.${photoVideo.type}`);
            }
        } catch (e) {
            console.log(e);
            return;
        }
        fileIndex++;
    }
    uploadMedia(formData);
}

async function uploadMedia(formData: FormData) {
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

// Compress video if it's over 8MB
// yeah you can just grab a different video variant but i do not trust twitter
async function compressVideo(id: string, blob: Blob) {
    const ffmpeg = createFFmpeg({ log: config.logDebug });
    await ffmpeg.load();
    ffmpeg.FS('writeFile', `${id}.mp4`, new Uint8Array(await blob.arrayBuffer()));
    await ffmpeg.run('-i', `${id}.mp4`, '-c:v', 'libx264', '-s:v', '1280x720', '-crf', '36', '-preset:v', 'fast', `output_${id}.mp4`);
    let output = ffmpeg.FS('readFile', `output_${id}.mp4`)
    let outputBlob = new Blob([new Uint8Array(output.buffer, output.byteOffset, output.length)]);
    ffmpeg.exit()
    return outputBlob;
}

export default downloadMedia;
