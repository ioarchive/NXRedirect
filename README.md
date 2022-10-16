# NXRedirect

A program to redirect/forward media tweets made from a Nintendo Switch onto Discord. 

## Usage:

1. Create a Twitter developer V2 app and grab the Bearer token
   - Note: Private accounts are not supported right now
2. Clone this repo somewhere


Then create the following files:

<details>
<summary>config.json</summary>
  
```json
{
    "checkSource": true,
    "autoReconnect": true,
    "logDebug": false,
    "token": "The bearer access token from your twitter app",
    "webhookUrl": "Discord webhook url to send stuff into"
}
```
`checkSource` will check the if the tweet source is tweeted from a switch ("Nintendo Switch Share")
`autoReconnect` will automatically reconnect to twitter if it drops
`logDebug` will log extra info like the tweet response to the console

----
</details>

<details>
<summary>rules.json</summary>

`value`: The filters and keywords to check against, works similar to twitter search
  - You can find a list of filter operators [here](https://developer.twitter.com/en/docs/twitter-api/tweets/search/integrate/build-a-query#list)
  
`tag`: Basically a display name for the value

Example:
```json
[
    {
        "value": "from:SplatoonNA has:media",
        "tag": "Media from Splatoon NA"
    },
    {
        "value": "from:ProChara -is:retweet has:media",
        "tag": "i am good at splatoon"
    },
    {
        "value": "from:azulcrescent has:media",
        "tag": "test tag"
    }
]
```
----
</details>

Finally, build and run:
```
pnpm i
pnpm build
node .
```

There is no feedback for successful connection, but it should be connected unless you receive an error.

# Contributing
To be completely honest I will probably not touch this for a while so if you wanna add something feel free to make a PR lol

To do:
- [ ] Add support for private accounts
- [ ] Support removing added rules through same json file
- [ ] Do something about some videos managing to be over 8mb (currently compresses with [ffmpeg-wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)) (LITERALLY HOW, its a switch)
