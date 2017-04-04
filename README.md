# Shaka Player Playback Technology for Video.js 

Shaka Player Playback Technology allows Video.js users to utilize [Shaka-Player](https://github.com/google/shaka-player) to playback MPEG DASH videos. This project is still under development, more features and enhancements will be available later.

### Dependencies
  - [Video.js](https://github.com/videojs)
  - [Video.js Font](https://github.com/videojs/font)
  - [Shaka-Player](https://github.com/google/shaka-player)

### Build
```
npm install
npm run build

```

### Run
```
npm run serve
```

### Usage
  - Include player-skin.js and player.full.js file in the html page.
  - Specify "shaka" in the techOrder array as needed.
  - Look at the included example for guidance.

### Example

```html
<video id=example-video width=600 height=300 class="video-js vjs-default-skin" controls></video>

<script src="video.js"></script>
<script src="player-skin.js"></script>
<script src="player.full.js"></script>


<script>
var player = videojs('example-video',{
         techOrder: ['shaka', 'html5']
     });

player.ready(function() {
  player.src({
    src: 'https://example.com/dash.mpd',
    type: 'application/dash+xml'
  });

  player.play();
});

</script>
```
An example is provided under the /example directory. Run the build script before using this example.

### Example With DRM

```html
<video id=example-video width=600 height=300 class="video-js vjs-default-skin" controls></video>

<script src="video.js"></script>
<script src="player-skin.js"></script>
<script src="player.full.js"></script>


<script>
var player = videojs('example-video',{
         techOrder: ['shaka', 'html5']
     });

player.ready(function() {
  player.src({
    src: 'https://example.com/dash.mpd',
    type: 'application/dash+xml',
    keySystemOptions: [
        {
            name: 'com.widevine.alpha',
            options: {
                serverURL: 'http://url',
                //any another advanced option
                videoRobustness: 'HW_SECURE_ALL',
                audioRobustness: 'HW_SECURE_ALL'
            }
        }
    ]
  });

  player.play();
});

</script>
```

### Screenshot
Below is a screenshot of videojs-shaka-player playing an MPEG DASH (VP9/Vorbis) VoD playlist. By default, the video is played back adaptively. The quality menu (gear) is automatically populated based on the size and bitrates of the video streams listed in the playlist. You can manually select a video quality to override auto (adaptive) mode, and switch back to auto mode at any time.

![Screenshot](example/screenshot.png "Video.JS 4.x")

![Screenshot](example/screenshot-vjs5.png "VideoJS 5.x")

### Icon
The provided example is using the cog icon from [videojs/font](https://github.com/videojs/font). You are free to use any other icon font to replace the existing one with the help of extra css rules.

### Special Thanks
Thanks to the Shaka Player team who wrote an amazing tool to support DASH playback.

Thanks to [Giles Thompson](https://github.com/gilest) for porting this to VideoJS 5.

### Support
This work is sponsored by [MetaCDN](http://www.metacdn.com), creators of [StreamShark](https://streamshark.io)
