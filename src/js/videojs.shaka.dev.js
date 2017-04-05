let shaka = require('shaka-player');
class ShakaTech {
    constructor(source, tech, options) {

        shaka.polyfill.installAll();
        options = options || tech.options_;

        this.player = videojs(options.playerId);
        this.player.dash = this.player.dash || {};

        this.tech_ = tech;
        this.el_ = tech.el();
        this.elParent_ = this.el_.parentNode;
        this.mediaPlayer_ = new shaka.Player(this.tech_.el_);
        //let estimator = new shaka.util.EWMABandwidthEstimator();
        //let shakaSource = new shaka.player.DashVideoSource(source.src, null, estimator);
        if (!source) {
            return;
        }


        // While the manifest is loading and Dash.js has not finished initializing
        // we must defer events and functions calls with isReady_ and then `triggerReady`
        // again later once everything is setup
        tech.isReady_ = false;

        if (ShakaTech.updateSourceData) {
            videojs.log.warn('updateSourceData has been deprecated.' +
                             ' Please switch to using hook("updatesource", callback).');
            source = ShakaTech.updateSourceData(source);
        }

        // call updatesource hooks
        ShakaTech.hooks('updatesource').forEach((hook) => {
            source = hook(source);
        });

        if (ShakaTech.ShakaTech) {
            videojs.log.warn('beforeInitialize has been deprecated.' +
                             ' Please switch to using hook("beforeinitialize", callback).');
            ShakaTech.ShakaTech(this.player, this.mediaPlayer_);
        }

        ShakaTech.hooks('beforeinitialize').forEach((hook) => {
            hook(this.player, this.mediaPlayer_);
        });

        let manifestSource = source.src;
        this.keySystemOptions_ = ShakaTech.buildDashJSProtData(source.keySystemOptions);
        if (this.keySystemOptions_) {
            this.mediaPlayer_.configure({drm: this.keySystemOptions_});
        }
        this.mediaPlayer_.load(manifestSource).then(() => {
            this.initShakaMenus();
            this.tech_.triggerReady();
        });
    }

    initShakaMenus() {
        let player = this.player;
        let shakaPlayer = this.mediaPlayer_;

        player.options_['playbackRates'] = [];
        let playerEL = player.el();
        playerEL.className += ' vjs-shaka';

        let shakaButton = document.createElement('div');
        shakaButton.setAttribute('class', 'vjs-shaka-button vjs-menu-button vjs-menu-button-popup vjs-control vjs-icon-cog');

        let shakaMenu = document.createElement('div');
        shakaMenu.setAttribute('class', 'vjs-menu');
        shakaButton.appendChild(shakaMenu);

        let shakaMenuContent = document.createElement('ul');
        shakaMenuContent.setAttribute('class', 'vjs-menu-content');
        shakaMenu.appendChild(shakaMenuContent);

        let videoTracks = shakaPlayer.getTracks();

        let el = document.createElement('li');
        el.setAttribute('class', 'vjs-menu-item vjs-selected');
        let label = document.createElement('span');
        setInnerText(label, "Auto");
        el.appendChild(label);
        el.addEventListener('click', function () {
            let selected = shakaMenuContent.querySelector('.vjs-selected');
            if (selected) {
                selected.className = selected.className.replace('vjs-selected', '')
            }
            this.className = this.className + " vjs-selected";
            shakaPlayer.configure({'enableAdaptation': true});
        });
        shakaMenuContent.appendChild(el);

        for (let i = 0; i < videoTracks.length; ++i) {
            if (videoTracks[i].type == "video") {
                (function () {
                    let index = videoTracks[i].id;
                    let rate = (videoTracks[i].bandwidth / 1024).toFixed(0);
                    let height = videoTracks[i].height;
                    let el = document.createElement('li');
                    el.setAttribute('class', 'vjs-menu-item');
                    el.setAttribute('data-val', rate);
                    let label = document.createElement('span');
                    setInnerText(label, height + "p (" + rate + "k)");
                    el.appendChild(label);
                    el.addEventListener('click', function () {
                        let selected = shakaMenuContent.querySelector('.vjs-selected');
                        if (selected) {
                            selected.className = selected.className.replace('vjs-selected', '')
                        }
                        this.className = this.className + " vjs-selected";
                        shakaPlayer.configure({'enableAdaptation': false});
                        shakaPlayer.selectTrack(index, false);
                        // TODO: Make opt_clearBuffer a property of this tech
                        // If above is set to true, you may wish to uncomment the below
                        // player.trigger('waiting');
                    });
                    shakaMenuContent.appendChild(el);
                }())
            }
        }
        let controlBar = playerEL.parentNode.querySelector('.vjs-control-bar');

        if (controlBar) {
            controlBar.insertBefore(shakaButton, controlBar.lastChild);
        }
    }

    /*
     * Iterate over the `keySystemOptions` array and convert each object into
     * the type of object Dash.js expects in the `protData` argument.
     *
     * Also rename 'licenseUrl' property in the options to an 'serverURL' property
     * Example:
     *  {
     *      servers: {
     *          'com.widevine.alpha': 'https://foo.bar/drm/widevine'
     *      },
     *      advanced: {
     *          'com.widevine.alpha': {
     *              'videoRobustness': 'HW_SECURE_ALL',
     *              'audioRobustness': 'HW_SECURE_ALL'
     *          }
     *      }
     *  }
     */
    static buildDashJSProtData(keySystemOptions) {
        let output = {servers: {}};

        if (!keySystemOptions || !isArray(keySystemOptions)) {
            return null;
        }
        for (let i = 0; i < keySystemOptions.length; i++) {
            let keySystem = keySystemOptions[i];
            let options = videojs.mergeOptions({}, keySystem.options);

            if (options.licenseUrl) {
                options.serverURL = options.licenseUrl;
                delete options.licenseUrl;
            }

            output.servers[keySystem.name] = options.serverURL;
            delete options.serverURL;
            if (Object.keys(options).length) {
                if (!output.advanced) {
                    output.advanced = {};
                }
                output.advanced[keySystem.name] = options;
            }
        }

        return output;
    }

    /**
     * Add a function hook to a specific dash lifecycle
     *
     * @param {string} type the lifecycle to hook the function to
     * @param {Function|Function[]} hook the function or array of functions to attach
     * @method hook
     */
    static hook(type, hook) {
        ShakaTech.hooks(type, hook);
    }

    /**
     * Get a list of hooks for a specific lifecycle
     *
     * @param {string} type the lifecycle to get hooks from
     * @param {Function=|Function[]=} hook Optionally add a hook tothe lifecycle
     * @return {Array} an array of hooks or epty if none
     * @method hooks
     */
    static hooks(type, hook) {
        ShakaTech.hooks_[type] = ShakaTech.hooks_[type] || [];

        if (hook) {
            ShakaTech.hooks_[type] = ShakaTech.hooks_[type].concat(hook);
        }

        return ShakaTech.hooks_[type];
    }

    /**
     * Remove a hook from a specific dash lifecycle.
     *
     * @param {string} type the lifecycle that the function hooked to
     * @param {Function} hook The hooked function to remove
     * @return {boolean} True if the function was removed, false if not found
     * @method removeHook
     */
    static removeHook(type, hook) {
        const index = ShakaTech.hooks(type).indexOf(hook);

        if (index === -1) {
            return false;
        }

        ShakaTech.hooks_[type] = ShakaTech.hooks_[type].slice();
        ShakaTech.hooks_[type].splice(index, 1);

        return true;
    }
}
ShakaTech.hooks_ = {};
const
    isArray = function (a) {
        return Object.prototype.toString.call(a) === '[object Array]';
    };

const canHandleKeySystems = (source) => {
    // copy the source
    source = JSON.parse(JSON.stringify(source));

    if (ShakaTech.updateSourceData) {
        videojs.log.warn('updateSourceData has been deprecated.' +
                         ' Please switch to using hook("updatesource", callback).');
        source = ShakaTech.updateSourceData(source);
    }

    // call updatesource hooks
    ShakaTech.hooks('updatesource').forEach((hook) => {
        source = hook(source);
    });

    let videoEl = document.createElement('video');
    return !(source.keySystemOptions && !(navigator.requestMediaKeySystemAccess ||
// IE11 Win 8.1
    videoEl.msSetMediaKeys));

};
const setInnerText = (element, text) => {
    if (typeof element === 'undefined') {
        return false;
    }
    let textProperty = ('innerText' in element) ? 'innerText' : 'textContent';
    try {
        element[textProperty] = text;
    } catch (anException) {
        element.setAttribute('innerText', text);
    }
};

videojs.DashSourceHandler = function () {
    return {
        canHandleSource: function (source) {
            let dashExtRE = /\.mpd/i;

            if (!canHandleKeySystems(source)) {
                return '';
            }

            if (videojs.DashSourceHandler.canPlayType(source.type)) {
                return 'probably';
            } else if (dashExtRE.test(source.src)) {
                return 'maybe';
            } else {
                return '';
            }
        },

        handleSource: function (source, tech, options) {
            return new ShakaTech(source, tech, options);
        },

        canPlayType: function (type) {
            return videojs.DashSourceHandler.canPlayType(type);
        }
    };
};

videojs.DashSourceHandler.canPlayType = function (type) {
    let dashTypeRE = /^application\/dash\+xml/i;
    if (dashTypeRE.test(type)) {
        return 'probably';
    }

    return '';
};

// Only add the SourceHandler if the browser supports MediaSourceExtensions
if (!!window.MediaSource) {
    videojs.getTech('Html5').registerSourceHandler(videojs.DashSourceHandler(), 0);
}

videojs.ShakaTech = ShakaTech;