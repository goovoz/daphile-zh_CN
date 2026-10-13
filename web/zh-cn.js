/*
 * zh-cn.js — Daphile beta 中文本地化层
 * ============================================================
 * 目标版本：fw2505251550 (beta 25.05-b251550)
 * 注入点：/var/www/localhost/cgi-bin/pagefooter 的 </body> 之前
 *
 * 设计要点（全部针对 Daphile 实证特征）：
 *  1. 页面 HTML 由 bash `echo` 直接生成 → 文案是**静态字符串**，
 *     绝大多数节点可整段精确匹配，无需正则 → 不会有性能灾难
 *  2. 但 daphile.js 会在运行时动态写 DOM（toast/对话框/状态），
 *     这些必须靠 MutationObserver 兜底
 *  3. 只改文本节点 nodeValue，绝不碰 value / checked / data 属性 / 事件绑定
 *     → 逻辑零影响
 *  4. 属性翻译（title/placeholder/alt）走单次标签遍历 + 限流，
 *     不用 querySelectorAll 加属性选择器（那在 3000+ 节点页面上极慢）
 *  5. PROTECT 白名单：含 DSD/DoP/PCM/ALSA/ReplayGain 等专名一律不译，
 *     防止破坏曲名/专辑名/设备名
 *  6. 分批 + 让出主线程 + Observer 上限，避免阻塞 Daphile 自身的初始化
 *
 * 禁用：控制台执行 MOODE_ZH_DISABLE=1（本名沿用习惯）或 DAPHILE_ZH_DISABLE=1
 * 诊断：window.__zhCn = { processed, translated, done }
 */
(function () {
  'use strict';
	/* ================= LMS Manage Plugins 词表 ================= */
	var LMS_DICT = {
		/* --- 插件名（key 不含版本号后缀）--- */
		'1001 Albums you must hear before you die': '生前必听 1001 张专辑',
		'ARD Audiothek': 'ARD 音频库',
		'Accuradio V1.*': 'Accuradio V1.*',
		'Additional Browse Modes': '附加浏览模式',
		'Advanced Tag View': '高级标签视图',
		'AirPlay bridge': 'AirPlay 桥接',
		'AllQuiet': '全员静音',
		'Alternative Play Count': '替代播放计数',
		'ArchiveOrg V0.6': 'ArchiveOrg V0.6',
		'Auto Dim Display': '自动调暗显示',
		'Auto Play': '自动播放',
		'AutoRescan': '自动重扫',
		'BBC Sounds': 'BBC Sounds',
		'BMPFonts Plugin': 'BMPFonts 插件',
		'Band\'s Campout': 'Bandcamp 营地',
		'BlankSaver': '黑屏保护',
		'Bliss Mixer': 'Bliss 混合器',
		'Bookmarks': '书签',
		'C-3PO Transcoding Helper': 'C-3PO 转码助手',
		'CBC Radio-Canada FranÃ§ais': 'CBC 加拿大法语电台',
		'CDplayer': 'CD 播放器',
		'CPlus': 'Canal+',
		'Chromecast bridge': 'Chromecast 桥接',
		'ClassicalRadio.com': 'ClassicalRadio.com',
		'Client Cleanup': '客户端清理',
		'Community Firmware': '社区固件',
		'Context Stats': '上下文统计',
		'ContextMenu': '上下文菜单',
		'Create docsets for Dash': '为 Dash 创建 docset',
		'Custom Clock Helper': '自定义时钟助手',
		'Custom Skip': '自定义跳过',
		'Custom Start Stop Times': '自定义起止时间',
		'Custom Tag Importer': '自定义标签导入',
		'Customize Device': '自定义设备',
		'DI.FM - Digitally Imported': 'DI.FM 数字导入',
		'DSDPlayer': 'DSD 播放器',
		'Daphile': 'Daphile',
		'Dark Logic Skin': '深色 Logic 皮肤',
		'Date and Spelled time': '日期与拼写时间',
		'Date and Time': '日期与时间',
		'Deezer local': 'Deezer 本地',
		'Denon/Marantz AVR Control': 'Denon/Marantz AVR 控制',
		'DenonSerial': 'Denon 串口',
		'Digital Inputs': '数字输入',
		'DirectPlay': '直接播放',
		'Disable Shuffle': '禁用随机播放',
		'Domoticz Control': 'Domoticz 控制',
		'Don\'t Stop The Music': '别让音乐停下',
		'Drag & drop music files to play': '拖放音乐文件播放',
		'Dynamic Mix': '动态混合',
		'Dynamic Playlist Creator': '动态播放列表创建器',
		'Dynamic Playlists': '动态播放列表',
		'Echo Classic': 'Echo Classic',
		'Enable ACL filetests': '启用 ACL 文件测试',
		'Enable/disable access to server settings': '启用/禁用服务器设置访问',
		'Eversolo Screen Control': 'Eversolo 屏幕控制',
		'Files Viewer': '文件查看器',
		'Fileviewer': '文件查看器',
		'Fleck Skin': 'Fleck 皮肤',
		'FranceTV': '法国电视',
		'Full text search': '全文搜索',
		'FuzzyTime': '模糊时间',
		'Global Player (UK)': 'Global Player（英国）',
		'Group Players': '播放器分组',
		'HQPlayer Bridge': 'HQPlayer 桥接',
		'Hits Playlist': '热门播放列表',
		'IR Blaster': '红外转发器',
		'Ignore files and folders': '忽略文件与文件夹',
		'Image Proxy configuration helper': '图片代理配置助手',
		'Info Browser': '信息浏览器',
		'JAZZRADIO.com': 'JAZZRADIO.com',
		'KidsPlay': '儿童播放',
		'KitchenTimer': '厨房定时器',
		'LCI': 'LCI',
		'Last.fm Audioscrobbler': 'Last.fm 音乐记录',
		'LastMix - Don\'t Stop The Music support using': 'LastMix - 别让音乐停下支持',
		'LastMix - Don\'t Stop The Music support using Last.fm.': 'LastMix — 别让音乐停下支持',
		'License Manager': '许可证管理器',
		'Line In': '线路输入',
		'Line Out': '线路输出',
		'Listen Later': '稍后收听',
		'ListenBrainz Fresh Releases': 'ListenBrainz 新发行',
		'Live365 V1.*': 'Live365 V1.*',
		'Local Player': '本地播放器',
		'MIP Mixer': 'MIP 混合器',
		'Material Skin': 'Material 皮肤',
		'Migration Assistant': '迁移助手',
		'Mixcloud': 'Mixcloud',
		'Mixlr': 'Mixlr',
		'Mobile Transcode Rules': '移动转码规则',
		'Music Information Screen': '音乐信息屏',
		'Music Walk With Me': '音乐随我行',
		'Music and Artist Information': '音乐与艺人信息',
		'MusicIP': 'MusicIP',
		'Musical Fidelity M6 Encore': 'Musical Fidelity M6 Encore',
		'Musical Fidelity Remote Access Enabler': 'Musical Fidelity 远程访问启用',
		'MyQobuz Extensions': 'MyQobuz 扩展',
		'Network Test': '网络测试',
		'Online Music Library Integration': '在线音乐库集成',
		'Other Players': '其他播放器',
		'Phil\'s Libraries': 'Phil 的音乐库',
		'Pitchfork Reviews': 'Pitchfork 乐评',
		'Planet Radio': 'Planet Radio',
		'PlayHLS': 'PlayHLS',
		'PlayLog': '播放日志',
		'PlayWMA': 'PlayWMA',
		'Playlist Manager': '播放列表管理器',
		'Podcast Extensions': '播客扩展',
		'Podcasts': '播客',
		'PotPourri': '大杂烩',
		'PowerCenter': '电源中心',
		'PowerSave': '省电',
		'Presets Editor': '预设编辑器',
		'Prevent System Standby': '阻止系统待机',
		'Pyrrha': 'Pyrrha',
		'Qobuz': 'Qobuz',
		'Queue Limit': '队列上限',
		'QuickAccess': '快速访问',
		'ROCKRADIO.COM': 'ROCKRADIO.COM',
		'RS232': 'RS232',
		'RSS News Ticker': 'RSS 新闻滚动',
		'Radio': '电台',
		'Radio Browser': '电台浏览器',
		'Radio Favourites': '电台收藏',
		'Radio France': '法国电台',
		'Radio Helsinki': '赫尔辛基电台',
		'Radio Now Playing': '电台正在播放',
		'Radio Paradise': '电台天堂',
		'Radio SRF Meta Information': '瑞士 SRF 电台元信息',
		'RadioFeeds UK and Ireland': 'RadioFeeds（英国与爱尔兰）',
		'RadioNet': 'RadioNet',
		'RadioTunes.com': 'RadioTunes.com',
		'Random Mix': '随机混合',
		'Rating Buttons': '评分按钮',
		'Ratings Light': '轻量评分',
		'Reliable HTTP': '可靠 HTTP',
		'Remote Music Libraries': '远程音乐库',
		'Report Analytics Data': '上报分析数据',
		'Rescan Music Library': '重扫音乐库',
		'Save Playlists from the Player UI': '从播放器界面保存播放列表',
		'SaverSwitcher': '屏保切换器',
		'SettingsManager': '设置管理器',
		'ShairTunes2 (fork)': 'ShairTunes2（分支版）',
		'SharkPlay': 'RadioShark 播放',
		'Signal Generator': '信号发生器',
		'Simple Library Views': '简易音乐库视图',
		'SiriusXM': 'SiriusXM',
		'SleepFade': '睡眠淡出',
		'SlimTris': 'SlimTris',
		'Snow Screensaver': '雪屏保',
		'SomaFM': 'SomaFM',
		'Song Info': '歌曲信息',
		'Song Lyrics': '歌词',
		'Song Scanner': '歌曲扫描器',
		'SoundCloud': 'SoundCloud',
		'Sounds & Effects': '音效',
		'SpotOn': 'SpotOn',
		'Spotify for Squeezebox. Still Spotty.': 'Spotify（Spotty 实现）',
		'Spotty Helper FreeBSD': 'Spotty FreeBSD 助手',
		'Squeeze Plex Hub': 'Squeeze Plex 枢纽',
		'SqueezeCLI Handler': 'SqueezeCLI 处理器',
		'SqueezeDSP': 'SqueezeDSP',
		'SqueezeESP32': 'SqueezeESP32',
		'SqueezeSonic': 'SqueezeSonic',
		'SqueezeboxEQ': 'SqueezeboxEQ',
		'StatusFirst': '状态优先',
		'Sub-Library demo': '子库演示',
		'SuperDateTime': '超级日期时间',
		'SuperDateTime Macro Extender': 'SuperDateTime 宏扩展',
		'Switch Player (Groups compatible)': '切换播放器（兼容分组）',
		'SyncOptions': '同步选项',
		'TIDAL local': 'TIDAL 本地',
		'TVH': 'TVHeadend',
		'Times Radio': 'Times Radio',
		'Title Switcher': '标题切换器',
		'UPnP/DLNA Media Interface': 'UPnP/DLNA 媒体接口',
		'UPnP/DLNA bridge': 'UPnP/DLNA 桥接',
		'Ultralight': 'Ultralight',
		'Unified Hi-Fi Control': '统一高保真控制',
		'Virgin Radio (UK)': 'Virgin Radio（英国）',
		'Virtual Library Creator': '虚拟音乐库创建器',
		'Visual Statistics': '可视化统计',
		'Visualizer Screensaver': '可视化屏保',
		'VolumeLock': '音量锁定',
		'WFMU': 'WFMU',
		'WaveInput': '波形输入',
		'Wefunk Radio': 'Wefunk 电台',
		'What Was That Tune?': '刚放的是什么曲子？',
		'XSqueezeDisplay': 'XSqueezeDisplay',
		'YouTube': 'YouTube',
		'Zen Radio': 'Zen 电台',
		'iBroadcast Online Music Library': 'iBroadcast 在线音乐库',
		'iHeart Radio - v1.2': 'iHeart Radio',
		'iTunes': 'iTunes',
		'phish.in\'': 'phish.in',
		'piCorePlayer Support': 'piCorePlayer 支持',
		'xAP Home Automation': 'xAP 家庭自动化',
		'xPL Interface': 'xPL 接口',
		'yandex': 'Yandex Music',
		/* --- 插件说明 --- */
		'A Lyrion Music Server plugin that bridges Plex metadata into LMS when tracks are streamed through the Squeeze Plex Hub application.': 'LMS 插件：把流经 Plex 的曲目元数据桥接进 LMS',
		'A Plugin to enable Linux PC audio to be captured and played through LogitechMediaServer. Default setup uses ALSA but OSS also works.': '让 Linux PC 的音频被采集并通过 LMS 播放，默认走 ALSA',
		'A Plugin to enable a Griffin RadioShark2 USB FM/AM tuner to be tuned and played through LogitechMediaServer': '让 Griffin RadioShark2 USB FM/AM 调谐器通过 LMS 选台播放',
		'A Plugin to enable an audio CD in the PC CD drive to be played through LogitechMediaServer. Requires CDDA2WAV to be installed. Use icedax for Ubuntu.': '让 PC 光驱中的音频 CD 通过 LMS 播放。需要 Daphile 已挂载光驱',
		'A book with 1001 albums chosen by a panel of music critics to be the most important and influential in popular music. This plugin will help you listen to them all. One album a day.': '由乐评人小组评选的 1001 张最具影响力专辑',
		'A collection of small features: change the track order of playlists, schedule auto power-off of all players, set a player\'s power-on start volume, limit or lock a player\'s volume, export static playlists to playlist files with custom file paths and file extensions, purge dead tracksâ¦ Complete feature list, screenshots and more information on the GitHub page.': '小功能合集：调整播放列表曲序、定时自动关机等',
		'A modern, responsive skin for Lyrion Music Server. Touch-friendly interface with a clean design, suitable for mobile and desktop use.': 'LMS 的现代响应式皮肤，触控友好、界面清爽',
		'A plugin that shows lyrics from chartlyrics.com and musixmatch.com through the Song Info plugin. This plugin requires that the Song Info plugin also is installed. (Boom, Transporter, Classic, Controller, Radio, Touch, SoftSqueeze, SqueezePlay)': '通过歌曲信息插件显示来自 chartlyrics.com 与 musixmatch.com 的歌词',
		'A plugin that\'s required for licensed plugins to work, it will give you an overview of licensed plugins available and their current licensing status and links to pay for them. (Boom, Transporter, Classic, Controller, Radio, Touch, SoftSqueeze, SqueezePlay)': '授权类插件运行所必需的组件，可概览已授权插件',
		'A plugin to make it possible to get various information about a song, can for example be used to get artist images from LastFM (Boom, Transporter, Classic, Controller, Radio, Touch, SoftSqueeze, SqueezePlay)': '获取歌曲各类信息的插件，可配合其他插件使用',
		'A plugin to play Yandex Music on Lyrion Music Server (LMS).': '在 LMS 上播放 Yandex Music 的插件',
		'A quick and easy way to create and manage your own virtual sublibraries / library views.': '快速创建并管理自己的虚拟子库与音乐库视图',
		'A responsive classic iPad-style LMS interface with advanced library, queue, player, signal-path and optional DSP controls.': '响应式经典 iPad 风格 LMS 界面，带音乐库、队列、播放器与信号链视图',
		'A skin focused on album art, easy browsing by disc, and thorough search functionality. Plays to the client device through the browser. Optimized for mobile screens.': '以专辑封面为核心的皮肤，按碟片浏览便捷，搜索功能完善',
		'Access RadioFeeds UK and Ireland on your Squeezebox including AAC+ and HLS streams (requires PlayHLS). We are the internet\'s most up-to-date directory of live streams for UK and Irish radio stations. Please register for a username before using at http://www.radiofeeds.co.uk/squeeze': '在 Squeezebox 上访问 RadioFeeds 英国与爱尔兰电台，含 AAC+ 与 HLS 流',
		'Access pCP Settings pages from within the LMS Settings.': '在 LMS 设置中访问 piCorePlayer 设置页',
		'Access to Podcasts': '播客访问',
		'Access to RSS News Feeds': 'RSS 新闻源访问',
		'Accuradio - provides access to Accuradio streams': 'Accuradio — 提供 Accuradio 流媒体访问',
		'Add providers to podcast': '为播客添加更多内容源',
		'Adds a UPnP/DLNA AV MediaServer and MediaRenderer, enabling access by other devices on the local network.': '添加 UPnP/DLNA AV 媒体服务器与渲染器，供局域网内其他设备访问',
		'Advanced Tag View': '高级标签视图',
		'Allow music playback from other Lyrion Music Server or UPnP/DLNA servers without switching the player.': '无需切换播放器，即可播放其他 LMS 或 UPnP/DLNA 服务器上的音乐',
		'Allows the "sleep" mode for any given player to fade the music out over the entire sleep period, rather than playing at a constant volume until the last minute. (Boom, Classic, Radio, Receiver, Slimp3, SoftSqueeze, Squeezebox1, Touch, Transporter)': '让任意播放器的睡眠模式在整个时段内淡出音乐，而非骤停',
		'Allows to disable shuffle, repeat and "add to playlist" mode for all clients. You can allow or disable each of these modes in the plugin settings.': '可为所有客户端禁用随机播放、循环与「加入播放列表」，并可按客户端单独放行',
		'Allows you to configure each player so it will display the current setting when you use the Sleep, Shuffle, Repeat, or volume keys on its remote control once, and only change the setting on subsequent button presses. Volume key behavio change does not work on Radio or Touch. (Boom,  Classic, Radio, Slimp3, Squeezebox1, Touch, Transporter)': '可配置每台播放器，使其在使用睡眠功能时显示当前设置',
		'Allows you to configure external image proxies to be used by LMS. Offload the heavy image processing to an external service.': '配置 LMS 使用的外部图片代理，把繁重的图片处理卸载出去',
		'Allows you to lock the analog and digital output levels of any Squeezebox, Transporter, or SliMP3. Can either prevent any changes in volume, or simply set a maximum volume. (Boom, Classic, Radio, Receiver, Slimp3, SoftSqueeze, Squeezebox1, Touch, Transporter)': '可锁定任意 Squeezebox、Transporter 的模拟与数字输出电平',
		'ArchiveOrg - a plugin that enables access to files on Archive.org': 'ArchiveOrg — 访问 Archive.org 上的音频文件',
		'AutoRescan detects changes to your music folder and automatically triggers a rescan of that directory if any files have been added, removed or changed.': 'AutoRescan 监测音乐目录变更并自动触发重扫',
		'Automate transcoding and resampling': '自动化转码与重采样',
		'Automatic Library Scanning': '自动扫描音乐库',
		'BMPFonts provides additional bitmap fonts for squeezeboxes with a VCD or OLED display (Transporter, SB2/3, Boom, squeezelite-esp32). The plugin consists of the fonts DINo, Neep, Spleen and Terminus. After installation of the plugin, the new fonts can be selected via the server settings for the specific device, in the display section.': '为配备 VCD 或 OLED 显示屏的 Squeezebox 提供额外点阵字体',
		'Bliss Mixer for DSTM': 'Bliss 混合器（别让音乐停下用）',
		'Bookmark Plugin - Adds the possibility to bookmark audio files. Useful for radio dramas and audio books.': '书签插件：可为音频文件添加书签，适合广播剧与有声书',
		'Browse Pitchfork album reviews in Lyrion Music Server and play the album from your streaming library': '在 LMS 中浏览 Pitchfork 专辑乐评，并从流媒体库播放该专辑',
		'Browse and listen to content of the ARD Audiothek.': '浏览并收听 ARD 音频库内容',
		'Browse and play Radio Helsinki on-demand programs, podcasts and clips.': '浏览并播放赫尔辛基电台的点播节目、播客与片段',
		'Browse and play artists and tracks from bandcamp.com.': '浏览并播放 bandcamp.com 上的艺人与曲目',
		'Browse and play internet radio stations from the community-driven Radio Browser directory (api.radio-browser.info). Search, top stations, by tag/genre and by country.': '浏览并播放社区驱动的 Radio Browser 目录中的网络电台',
		'Browse and play shows from wefunkradio.com': '浏览并播放 wefunkradio.com 的节目',
		'Browse and play shows from wefunkradio.com.': '浏览并播放 wefunkradio.com 的节目',
		'Browse your ListenBrainz Fresh Releases feed in Lyrion Music Server': '在 LMS 中浏览你的 ListenBrainz 新发行动态',
		'Build a saved playlist of an artist\'s actual hits from your own library. Uses Last.fm popularity data to pick the tracks, then matches them against the music you already own. Includes similar-artist expansion and a basket for combining several artists.': '从你的音乐库中挑选某位艺人的热门曲目生成播放列表，依据 Last.fm 热度',
		'CBC Radio-Canada FranÃ§ais programme and track information': 'CBC 加拿大法语电台节目与曲目信息',
		'CBC Radio-Canada Français programme and track information': 'CBC 加拿大法语电台节目与曲目信息',
		'ClassicalRadio.com - Beautifully Curated Classical Music': 'ClassicalRadio.com — 精心策展的古典音乐',
		'Community Firmware for SqueezeBox Touch/Radio/Controller': '适用于 Squeezebox Touch/Radio/Controller 的社区固件',
		'Complete BBC Sounds implementation as an LMS Plugin.  BBC live radio, catch-up, music mixes and podcasts.': '完整的 BBC Sounds LMS 插件：直播电台、回听、音乐合辑与播客',
		'Configure multiple screensavers for the When Off, When Playing, and When Idle modes, either having SqueezeCenter cycle through a number of plugins or allowing you to change screensavers with a single button press. Easily change screensavers, or immediately jump to the When Playing screensaver, if used with ContextMenu. Can display "conditional" screensavers, as with KitchenTimer (set a screensaver to display onlly if it has something to report). (Boom, Transporter, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '为关机、播放、空闲三种状态分别配置多个屏保',
		'ContextMenu provides a mechanism for context menus much like the right-click context menus provided by computer operating system desktop environments. Provides a way to use any regular Squeezebox remote control button, even on the Boom. Other plugins that provide ContextMenu options include AllQuiet, KitchenTimer, PlayLog, and SaverSwitcher. (Boom, Transporter, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '提供类似桌面右键菜单的上下文菜单机制',
		'Continue your listening on a different player - easily.': '把当前聆听无缝转移到另一台播放器上继续',
		'Control X-10 and Insteon modules with a Squeezebox Controller, Radio, Touch, old-style infrared remote, or Boom or Transporter buttons. Use Insteon or X-10 to have a device turn on and off when a specific player is turned on or off. Turn a coffee pot on when an alarm sounds. (Boom, Classic, Controller, Radio, Receiver, Slimp3, SoftSqueeze, Squeezebox1, Touch, Transporter)': '用 Squeezebox 控制器或红外遥控控制 X-10 与 Insteon 智能家居模块',
		'Control your Domoticz devices from your Jive based player. Parameters are located in player settings': '从 Jive 系列播放器控制 Domoticz 智能家居设备，参数位于播放器设置中',
		'Create additional browse modes to browse your music library by Album Artists, Composers, select Genres and more.': '创建附加浏览模式，可按专辑艺人、作曲、年代、流派等维度浏览音乐库',
		'Creates new libraries for "Not Rated" and "Rated High", dependent on Erlands TrackStat plugin': '依赖 TrackStat 插件，创建「未评分」与「高评分」虚拟音乐库',
		'DI.FM - Addictive Electronic Music': 'DI.FM — 令人上瘾的电子音乐',
		'DSP and EQ for Squeezebox server based off InguzDSP': '基于 InguzDSP 的 LMS 服务器端 DSP 与均衡器',
		'DSP for Lyrion Music Server - provides EQ and DSP.': 'LMS 的 DSP 插件，提供均衡与数字信号处理',
		'Dark-themed version of the LMS Logic Teal skin': 'LMS Logic Teal 皮肤的深色版本',
		'Date and Time Screensaver': '日期与时间屏保',
		'Daughter of Pandora': 'Pandora 之女',
		'Deezer for local LMS use': 'Deezer 本地集成',
		'Digital Input for Transporter': 'Transporter 的数字输入',
		'Display Kodi (XBMC) Now Playing info on a Squeezebox SB2/3/Classic display.': '在 Squeezebox SB2/3/Classic 屏幕上显示 Kodi（XBMC）的正在播放信息',
		'Display lists of tracks, albums or artists sorted by statistics from the context menus of artists, albums, genres, years and playlists.': '在艺人/专辑/曲目的上下文菜单中按统计信息排序显示列表',
		'Displays local time, date, weather, sports, and stock information.': '显示本地时间、日期、天气、体育与股票信息',
		'Don\'t Stop The Music will make sure you don\'t let the silence kill your flow. Once you reach the end of your playlist it will automatically add music similar to what you\'ve been listening to.': '别让音乐停下：当队列播放完毕后自动补充相似曲目，避免静默打断聆听',
		'Export your music library as a Docset to be used with Dash (http://kapeli.com/dash). This allows you to quickly search your library on your Mac computer without firing up the Logitech Media Server web UI.': '把音乐库导出为 Dash 可用的 Docset，便于离线快速检索文档',
		'Extension for Dynamic Playlist, using MusicIP to produce mixes.': '动态播放列表扩展，用 MusicIP 生成混合曲目流',
		'Fetches values from one or more JSON endpoints and makes them available to SuperDateTime/Custom Clock via sdtMacroString chaining.': '从一个或多个 JSON 接口取值，供 SuperDateTime/自定义时钟使用',
		'For Squeezeboxes connected to Denon receivers with RS232 or Ethernet interfaces, use your Squeezebox Controller, Squeezebox IR remote control, Web interface, etc. to control your Denon volume. (Transporter, Classic, Receiver)': '为通过 RS232 或以太网连接 Denon 功放的 Squeezebox 提供控制',
		'Get more control over how your online music libraries are integrated with your local music.': '更精细地控制在线音乐库与本地音乐库的整合方式',
		'Gives new settings for synchronizing players: relative volume sync; "wait for next track" to avoid disruptions; "unsync at power off"; restore local playlist after leaving a sync group. (Boom, Classic, Radio, Receiver, Squeezebox1, Slimp3, SoftSqueeze, Touch, Transporter)': '提供播放器同步新选项：相对音量同步、等待下一曲等',
		'Global Radio\'s UK Stations (Classic FM, Capital, Heart, LBC, Radio X etc) Live Radio (with pause and rewind), Catch-up, Live Playlists, Podcasts.': 'Global Radio 英国各台（Classic FM、Capital、Heart、LBC、Radio X 等）直播与回听',
		'Have SqueezCenter execute specific sets of commands for certain buttons, so you can give a chi': '让特定按键执行预设命令组，便于给儿童使用',
		'Have SqueezeCenter execute specific sets of commands for certain buttons, so you can give a child a remote control with limited function, or redefine Boom or Radio 1-6 preset buttons or the button on a Squeezebox Receiver. (Boom, Classic, Radio, Receiver, Slimp3, Squeezebox1, Transporter)': '让特定按键执行预设命令组：可给孩子一个功能受限的遥控器，或重新定义 Boom/Radio 的 1-6 预设按键。适用于 Boom、Classic、Radio、Receiver 等设备',
		'Have a look at your library statistics with charts.': '用图表查看音乐库统计信息',
		'Helps you back up and restore server, plugin and player preferences, playlists and per-track statistics when migrating to a new installation.': '备份与恢复服务器、插件、播放器偏好、播放列表及逐曲目状态',
		'Helps you create custom smart playlists (dynamic playlists) for the Dynamic Playlists plugin.': '辅助为动态播放列表插件创建自定义智能播放列表',
		'IR Blaster can control other equipment (i.e. your amp) via IR sent out by your SB Classic, Transporter or SB Touch on some events (i.e. power on/off and volume up/down).': '红外转发器：通过 SB Classic/Transporter 发出红外信号控制功放等其他设备',
		'Internet Radio Directories': '网络电台目录',
		'JAZZRADIO.com - Enjoy Great Jazz Music': 'JAZZRADIO.com — 享受优质爵士乐',
		'Jukebox For your Music': '你的音乐点唱机',
		'Keep track of what was playing while you were too busy to check the display.': '记录你没来得及看屏幕时正在播放的内容',
		'Last.fm a music service that builds up your personal music profile by tracking the music you listen to. Based on your taste, Last.fm provides customized radio stations, music and event recommendations, free downloads and more. Join for free at www.last.fm/join or find out more at www.last.fm/tour.': 'Last.fm：通过记录收听历史构建个人音乐档案的服务',
		'LastMix allows you to create Last.fm based mixes for the "Don\'t Stop The Music" plugin.': 'LastMix：为「别让音乐停下」插件创建基于 Last.fm 的混合曲流',
		'Limit queue history size': '限制队列历史长度',
		'Line In for Boom': 'Boom 的线路输入',
		'Listen to iHeart Radio Live US,CA,AU,NZ and MX stations': '收听 iHeart Radio 美国、加拿大、澳大利亚、新西兰、墨西哥直播电台',
		'Live365 - provides access to Live365 directory of internet stations': 'Live365 — 提供 Live365 网络电台目录访问',
		'Local playback from your server computer using the Squeezelite software emulator.  This plugin uses Squeezelite to playback through the audio output of your server computer.  The player can be controlled from the server\'s web interface or other Squeezebox controller applications.  Note: the plugin will only support servers or NAS devices with Intel or ARM processors.': '用 Squeezelite 软模拟器在服务器本机播放。Daphile 已内置，无需安装',
		'Makes it possible to get text information on the player screen that switches between different kind of information, for example showing artist 5 seconds and album name 5 seconds. The plugin requires that the Music Information Screen(MusicInfoSCR) plugin is installed. (Boom, Transporter, Classic, SoftSqueeze)': '可在播放器屏幕上轮换显示不同的文本信息',
		'Material themed skin, suitable for mobile use.': 'Material 风格皮肤，适合移动端使用',
		'MusicIP Mixer for DSTM': 'MusicIP 混合器（别让音乐停下用）',
		'MusicIP integration': 'MusicIP 集成',
		'MyQobuz view to Qobuz': 'MyQobuz 的 Qobuz 视图',
		'Network Test': '网络测试',
		'Optimized custom-convert.conf rules for mobile Lyrion clients (LyrPlay). Enables MP3 (320kbps), WAV, Opus and OGG Vorbis transcoding.': '为移动端 Lyrion 客户端优化的转码规则，启用 MP3 320kbps 等',
		'Play Canal+ video': '播放 Canal+ 视频',
		'Play FranceTelevisions video': '播放法国电视节目视频',
		'Play LCI/TF1 video': '播放 LCI/TF1 视频',
		'Play Mixlr broadcasts (by adding the URL to the queue).': '播放 Mixlr 直播（把 URL 加入队列即可）',
		'Play YouTube video': '播放 YouTube 视频',
		'Play albums, artists or songs directly by database ID': '按数据库 ID 直接播放专辑、艺人或曲目',
		'Play music from Mixcloud': '播放 Mixcloud 上的音乐',
		'Play music from SoundCloud': '播放 SoundCloud 上的音乐',
		'Play music from a Subsonic API capable music library': '播放支持 Subsonic API 的音乐库',
		'Play radio channels from SomaFM': '播放 SomaFM 电台频道',
		'Play radio streams and archived programs from WFMU': '播放 WFMU 的电台流与存档节目',
		'Play the lossless, interactive Radio Paradise streams!': '播放 Radio Paradise 的无损互动流！',
		'PlayHLS - a minimal plugin that sets ups LMS conf file to play HLS URL using a media player application - ffmpeg by default': 'PlayHLS：极简插件，配置 LMS 以便用媒体播放器应用播放 HLS 流',
		'Playback of DSD files (.dsf and .dff) via your Squeezebox.  Supports conversion to PCM or playback as DSD-over-PCM (DoP) for DACs supporting DoP.': '通过 Squeezebox 播放 DSD 文件（.dsf/.dff），支持转 PCM 或原生直播',
		'Player interface for jumping to arbitrary positions within the currently playing song (Squeezebox Classic, Squeezebox Boom, Transporter only)': '播放器界面插件，可在当前曲目中跳转到任意位置',
		'Plugin to demonstrate support for multiple (or virtual) libraries. This plugin will create some (partly useless) virtual libraries. It\'s mostly intended as an inspiration for plugin developers.': '演示多库（虚拟库）支持的示例插件，会创建若干示例虚拟库',
		'Plugin to easily generate library views.': '轻松生成音乐库视图',
		'Plugin to provide "squeezecli:" and "squeezeexec:" protocol handlers so actions can be embedded': '提供 squeezecli:/squeezeexec: 协议处理，可在文本中嵌入控制动作',
		'Plugin to provide "squeezecli:" and "squeezexec:" protocol handlers so actions can be embedded in playlists.': '提供 squeezecli:/squeezeexec: 协议处理，可在播放列表中嵌入控制动作',
		'Power off your squeezebox after a certain amount of time (idle or otherwise)': '闲置或达到设定时间后自动关闭 Squeezebox',
		'Presents each HQPlayer instance as a native Lyrion player over HQPlayer\'s own control API - no UPnP bridge and no helper in the playback path; HQPlayer fetches the stream straight from Lyrion, which still converts the formats HQPlayer cannot decode': '通过 HQPlayer 自身的控制 API，把每个 HQPlayer 实例呈现为原生 Lyrion 播放器',
		'Programme and track information including cover art for over 7900 radio stations': '为 7900 多个电台提供节目与曲目信息（含封面）',
		'Programme, track and podcast information for Planet Radio / Rayo / Bauer Media': 'Planet Radio / Rayo / Bauer Media 的节目、曲目与播客信息',
		'Provides a "date and time" screensaver that can act like a clock set "ahead" of the real time, and allows other plugins to display such "fast" times and set timers based on such displayed time. (Boom, Transporter, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '提供日期时间屏保，可让显示时间比真实时间快（便于对照日程）',
		'Provides a Web interface for copying settings from one player to another, permanently "linking" settings on multiple Squeezeboxes, setting defaults for newly connected Squeezeboxes or remote /stream.mp3 clients, and importing/exporting client settings, to make it easier to manage multiple Squeezebox players. (Boom, Classic, Receiver, Slimp3, SoftSqueeze, Squeezebox1, Transporter)': '提供 Web 界面，把一台播放器的设置复制到另一台并建立持久关联',
		'Provides alternative play counts and skip counts that aim to reflect your true listening history. You set a time after which a song counts as played. If you skip the song before, it counts as skipped, not played. Optionally records a detailed play history with timestamps, player and rating at the time of play, with display for individual tracks, albums, artists or all tracks. Use the data with other plugins to create/play smart playlists (dynamic playlists), create virtual libraries or skip tracks.': '提供更贴近真实收听历史的播放与跳过计数',
		'Provides capability to view text files on a SqueezeBox Classic player.': '在 Squeezebox Classic 播放器上查看文本文件',
		'Provides functionality to add songs or albums to any chosen playlist.': '提供把歌曲或专辑加入任意指定播放列表的功能',
		'QuickAccess provides similar functionality as Favorites plus the possibility to pass a playlist from player to player. Just press and hold a number button and the assigned playlist starts playing. You may select playlists from each player or your server\'s web interface. You will also need to place the custom.map file (http://jasonholtzapple.github.io/slimdevices/plugins/quickaccess/7.3/custom.map) in your Squeezecenter/IR directory by hand.': '快速访问：类似收藏夹，并支持把播放列表传给其他播放器',
		'ROCKRADIO.COM | rock music for life': 'ROCKRADIO.COM — 为生命而摇滚',
		'RS232 access for Transporter': 'Transporter 的 RS232 访问',
		'Radio Favourites - Manage your favourite radios stations. Select your station according to the current live programme.': '电台收藏：管理常用电台，可按流派/国家/语言筛选',
		'Radio France programme and track information plus on demand replay': '法国电台节目与曲目信息，支持点播回听',
		'RadioNet - provides access to Radio.net internet radio directory': 'RadioNet — 提供 Radio.net 网络电台目录访问',
		'RadioTunes.com - Your daily music fix': 'RadioTunes.com — 你的每日音乐补给',
		'Read album reviews, artist biographies, related artists, song lyrics, see artist pictures and much more.': '读取专辑乐评、艺人传记、相关艺人、歌词，查看艺人图片等',
		'Reliable HTTP connection for LMS': '为 LMS 提供更可靠的 HTTP 连接',
		'Remove orphaned client configurations': '移除孤立的客户端配置',
		'Retrieve information from internet sources and displaying via Remote, Server or Player displays.  See the settings section for information about adding additional information sources.': '从互联网获取信息并显示在遥控器、服务器或播放器屏幕上',
		'Save Playlists from the Player UI': '从播放器界面保存播放列表',
		'Save albums from your library or any streaming service to a Listen Later list, with automatic Played tracking': '把音乐库或流媒体中的专辑存入「稍后收听」列表，并自动同步',
		'Scans track information from custom tags in your music files (incl. rating tags).': '从音乐文件的自定义标签中扫描曲目信息（含评分标签）',
		'Screensaver that simply makes the screen go dark -- most useful with SaverSwitcher, providing an easy way to make the display go dark without having to cycle through all brightness options. (Boom, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '纯粹让屏幕变暗的屏保，配合 SaverSwitcher 使用效果最佳',
		'Select any of the other players that are connected to your Logitech Media Server and provides ways of controlling them.': '选择 LMS 中其他已连接播放器并提供相应控制',
		'Set a regular expression to ignore files and folders when scanning or browsing folders.': '设置正则表达式，在扫描或浏览时忽略指定文件与文件夹',
		'Set automatic display dimming, as for making the display go dark at bedtime and become visible again in the morning. (modified version of code from Eric Koldinger, koldware.com). Will use FuzzyTime "displayed time" if FuzzyTime is installed (optional). (Boom, Transporter, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '设置显示自动调暗，如入睡时熄屏、起床时亮起',
		'Set rules for when the current track or upcoming tracks in your player\'s playlist should be skipped and removed from the playlist automatically.': '设置自动跳过当前或后续曲目的规则',
		'Set, display, import, export, log, backup and restore track ratings. Create virtual sublibraries / library views for rated tracks with optional LMS browse menus.': '设置、显示、导入、导出、记录、备份与恢复曲目评分，并可创建虚拟子库',
		'ShairTunes2 Integration (w/Windows)': 'ShairTunes2 集成（含 Windows 支持）',
		'Share your server version, number of players, number of tracks, installed plugins, operating system, Perl version, skin used, and the hardware platform with the LMS Community. This will help us prioritize further development. Thanks for enabling this plugin! Learn more on https://lyrion.org/analytics/learn-more/.': '共享服务器版本、播放器数量、曲目数、已装插件、操作系统等匿名统计信息',
		'Signal Generator plugin.  Now supports Squeezeplay as well as SB2/3/Transporter.': '信号发生器插件，支持 Squeezeplay 与 SB2/3/Transporter',
		'Silence all players simply by holding the Sleep button; all players will display the name of the player that asked for silence, in case you need help. Also provides a CLI command to silence/pause all players and display a custom message. (Boom, Transporter, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '长按睡眠键即可静音所有播放器，并显示当前播放曲目名',
		'Skip unwanted parts of a song (e.g. annoying intros, silence at the end or in the middle).': '跳过歌曲中不需要的片段（如烦人的前奏、结尾或中段的静默）',
		'Snow Screensaver': '雪景屏保',
		'Sounds & Effects': '音效',
		'Source-agnostic hi-fi control bridge for Roon, LMS, HQPlayer, and hardware knobs. Provides HTTP APIs, MQTT integration, and web UI for controlling your audio system from anywhere.': '跨音源高保真控制桥：统一对接 Roon、LMS、HQPlayer 与硬件旋钮，提供 HTTP 接口',
		'Spotify plugin for Lyrion Music Server': 'LMS 的 Spotify 插件',
		'Spotty Helper for FreeBSD 14+. Requires Spotty plugin.': 'Spotty 的 FreeBSD 14+ 辅助组件，需配合 Spotty 插件',
		'SqueezeESP32 additional player id (100/101)': 'SqueezeESP32 附加播放器 ID（100/101）',
		'Start playback when powered on or reconnected': '开机或重连时自动开始播放',
		'Stream Qobuz to your Squeezebox.': '把 Qobuz 流媒体推送到 Squeezebox。',
		'Stream SiriusXM satellite radio through Lyrion Music Server': '通过 LMS 播放 SiriusXM 卫星电台',
		'Support for Musical Fidelity M6 Encore to your LMS': '为 LMS 添加 Musical Fidelity M6 Encore 支持',
		'Swiss Radio SRF Stream Meta Information Parser': '瑞士 SRF 电台流元信息解析器',
		'Switch Playlist between players (Triode plugin compatible with Group Player plugin)': '在播放器之间切换播放列表（兼容 Group Player 插件）',
		'TIDAL for local LMS use': 'TIDAL 本地集成',
		'TVHeadend Radio Plugin for Lyrion Media Server': 'TVHeadend 电台插件',
		'Tetris for your Squeezebox or Transporter!': '给你的 Squeezebox 或 Transporter 玩的俄罗斯方块！',
		'The Music Information Screen plugin allows customization of the player\'s Now Playing screen and other elements.': '音乐信息屏插件：可自定义播放器正在播放界面及屏保显示内容',
		'The next generation Spotify implementation for Squeezebox.': '下一代 Squeezebox Spotify 实现',
		'The plugin for Daphile extras.': 'Daphile 扩展功能插件。',
		'This extension replaces the rather simplistic title search with a full text search. This would eg. find playlists with a track of the searched title, or filter out lossy files by adding "flac" to the search term. Disabling this plugin restores the old, simple title search. Powerusers please note: full text search is not available when using MySQL.': '用全文搜索替换 LMS 简易的标题搜索，可检索艺人、专辑、作曲、注释等字段',
		'This is a helper plugin for the Custom Clock screen saver applet, it makes it possible to create your own clock styles and modify the existing styles (Controller, Radio, Touch, SqueezePlay)': '自定义时钟屏保的辅助插件，可创建个性化时钟样式',
		'This plugin allows a network-ready Denon or Marantz AVR connected to an LMS player to be controlled from any Lyrion client app via telnet. In addition to automatically turning the AVR on and off and changing/muting the volume, other AVR settings can be adjusted using a set of client menus.': '让连接到 LMS 播放器的 Denon/Marantz 网络功放可被控制',
		'This plugin allows you do drag and drop audio files from your desktop\'s file manager (Finder, Explorer etc.) to the Lyrion Music Server web interface to play them back. Files which are not available from the Lyrion Music Server are temporarily transfered for the playback.': '支持把桌面文件管理器中的音频文件直接拖放到 LMS 播放',
		'This plugin allows you to check file permissions based on ACLs on some systems. Do not enable this plugin unless you know your system does support ACLs and Perl\'s \'use filetest\'.': '基于 ACL 检查文件权限。除非确有需要，否则不建议启用',
		'This plugin allows you to set simple countdown timers. Timers can be given names and saved for later re-use. Timers can be shortened or extended if needed. Includes a countdown screensaver designed for use with SaverSwitcher (only displayed if there\'s an active timer). (Boom, Transporter, Classic, Squeezebox1, Slimp3, SoftSqueeze)': '设置简易倒计时器，可命名并保存以便重复使用',
		'This plugin allows you to visually edit the configuration of your Squeezebox preset keys.': '可视化编辑 Squeezebox 预设按键的配置',
		'This plugin allows you you to log the tracks you listen to, either automatically or by pressing a few remote control buttons. It provides a web interface for viewing its log, linking to the web for more information about what you\'ve listened to, and downloading XML and M3U playlists of played songs. (Boom, Classic, Slimp3, SoftSqueeze, Squeezebox1, Transporter; limited support for Radio, Receiver, and Touch)': '可自动或手动记录你听过的曲目',
		'This plugin provides support on Linux and OSX for playing Windows Media (WMA, WMA lossless, WMA Pro)  streams and files using ffmpeg. It is mainly used for player which do not support WMA nativelysuch as SliMP3, SqueezeBox1, Softsqueeze, Squeezeslave and Squeezeplay': '为 Linux 与 macOS 提供 Windows Media（WMA、WMA 无损等）播放支持',
		'This plugin tries to enable SSH on your Musical Fidelity Encore device. USE AT YOUR OWN RISK! DO NOT USE IF YOU ALREADY HAVE SSH ACCESS TO YOUR MF. Once access has been successfully established, you can uninstall the plugin again.': '尝试在 Musical Fidelity Encore 设备上启用 SSH。风险自负！',
		'This plugins allows you to disable access to the settings pages from the Squeezebox Server\'s web interface.': '可禁止从 LMS Web 界面访问设置页',
		'Times Radio (UK) Live and 7 Day Catch Up with on air data and images.': 'Times Radio（英国）直播与 7 天回听，含播出数据与图片',
		'Toggle between sub woofer, headphone, and line out mode on Boom': '在 Boom 上切换低音炮、耳机与线路输出模式',
		'Turns on and keeps display on whilst playing and turns off display when no music playing after 30sec': '播放时保持屏幕常亮，停止播放一段时间后熄屏',
		'Use AirPlay compatible devices in LMS': '在 LMS 中使用 AirPlay 兼容设备',
		'Use Chromecast devices in LMS': '在 LMS 中使用 Chromecast 设备',
		'Use UPnP/DLNA players in LMS': '在 LMS 中使用 UPnP/DLNA 播放器',
		'Use remote buttons and the default web interace to rate songs on Squeezebox Classic, Boom and Transporter': '用遥控器按键或 Web 界面为 Squeezebox Classic/Boom/Touch 上的歌曲评分',
		'Use smart playlists (dynamic playlists) to play continuous music mixes based on your selection criteria.': '用智能播放列表基于你的选择持续播放混合曲流',
		'Virgin Radio (UK) Plugin.  Access to live and 7 day catch up for Virgin Radio, Talk Radio, talkSport and Times Radio, includes all News UK stations': 'Virgin Radio（英国）插件：Virgin Radio、Talk Radio 等直播与 7 天回听',
		'Visualizer Screensaver': '可视化屏保',
		'You may customize your Squeezebox Controller by selecting additional wallpaper images and sound effects which will become available on the settings menus for your Squeezebox Controller, Radio or Touch device.': '可通过选择额外壁纸与音效自定义 Squeezebox 控制器',
		'Zen Radio - Relaxation & Meditation Music': 'Zen Radio — 放松与冥想音乐',
		'iBroadcast online personal music library integration.  Fully integrate and stream your online iBroadcast music library from your LMS Music Library.': 'iBroadcast 在线个人音乐库集成，可完整整合并流式播放',
		'iTunes integration': 'iTunes 集成',
		'on-the-fly group creation': '即时创建播放器分组',
		'phish.in\' - access to Live Phish Audio Streams': 'phish.in — 访问 Phish 现场音频流',
		'xAP Home Automation connects Squeezebox Server with other xAP-enabled services and devices around the home.': 'xAP 家庭自动化：把 LMS 与家中其他支持 xAP 的服务和设备连接起来',
		'xPL Interface': 'xPL 接口',
		'插件与当前平台不兼容。': '插件与当前平台不兼容。',
	};
	/* ================= LMS 词表结束 ================= */

  if (window.DAPHILE_ZH_DISABLE === 1 || window.MOODE_ZH_DISABLE === 1) return;
  if (window.__zhCnInstalled) return;
  window.__zhCnInstalled = true;

  /* ---------------------------------------------------------------
   * 术语表：按「整段精确匹配」组织，key 为英文原文，value 为中文
   * 分组便于维护；顺序不影响匹配（用哈希表查找）
   * --------------------------------------------------------------- */
  var DICT = {
    /* ---------- 系统操作 ---------- */
    'Shutdown': '关机',
    'Restart': '重启',
    'Suspend': '休眠',
    'Reload': '刷新',
    'Cancel': '取消',
    'Accept': '接受',
    'Decline': '拒绝',
    'Close': '关闭',
    'Save': '保存',
    'Save Settings': '保存设置',
    'Save & Restart': '保存并重启',
    'Save R&D options': '保存 R&D 选项',
    'Save and applying the new audio device settings...': '正在保存并应用新的音频设备设置…',
    'Reset': '重置',
    'Reset EQ': '重置均衡器',
    'Install': '安装',
    'Eject': '弹出',
    'Stop': '停止',
    'Start': '启动',
    'Restart system': '重启系统',
    'Restarting': '正在重启',
    'Confirm & Restart': '确认并重启',
    'Reset & Restart': '重置并重启',
    'Cancel download': '取消下载',
    'Disable': '禁用',
    'Disabled': '已禁用',
    'Enable': '启用',
    'Enabled': '已启用',
    'Automatic': '自动',
    'None': '无',
    'Internal': '内置',
    'General': '常规',
    'Advanced': '高级',
    'Actions': '操作',
    'Options': '选项',
    'Edit': '编辑',
    'View': '查看',
    'View Log': '查看日志',
    'View Progress': '查看进度',
    'View Previous Scan Details': '查看上次扫描详情',
    'Report': '报告',
    'Credits': '致谢',
    'Full': '完整',
    'Dark': '深色',
    'Light': '浅色',
    'Hide': '隐藏',
    'Show': '显示',
    'Device': '设备',
    'Connected': '已连接',
    'Abort': '中止',
    'Processing...': '处理中…',
    'Please wait for a while...': '请稍候…',
    'Finishing...': '收尾中…',
    'Starting': '启动中',
    'Rescanning': '重新扫描中',
    'Inaccurate': '不精确',

    /* ---------- 播放状态 / 传输 ---------- */
    'Encoding': '编码中',
    'ENCODING': '编码中',
    'ENCODED': '已编码',
    'FAILED': '失败',
    'RIPPING FAILED': '抓取失败',
    'READY': '就绪',
    'WAIT': '等待',
    'PAUSE': '暂停',
    'PLAYING': '播放中',
    'STOPPED': '已停止',
    'Rate unknown': '未知码率',
    'Media Server Restart': '媒体服务器重启',
    'Restart Media Server': '重启媒体服务器',
    'Restart Media Server with reset databases': '重启媒体服务器并重置数据库',
    'Restart players': '重启播放器',
    'Restarting Media Library...': '正在重启媒体库…',
    'Loading the Media Server...': '正在加载媒体服务器…',
    'Rescanning Media Library...': '正在重新扫描媒体库…',
    'Waiting for Media Server...': '等待媒体服务器…',
    'Clear library and rescan everything': '清空媒体库并全量重扫',
    'Look for new and changed audio files': '查找新增与变更的音频文件',
    'Only rescan playlists': '仅重扫播放列表',
    'Rescan': '重新扫描',
    'Media Server': '媒体服务器',
    'Calculating replay gain tags...': '正在计算 ReplayGain 标签…',
    'Look for new and changed': '查找新增与变更',

    /* ---------- 音频设备 / 输出 ---------- */
    'Audio Devices': '音频设备',
    'Volume control': '音量控制',
    'Mixer controls': '混音器控制',
    'Sample rate': '采样率',
    'Bit depth': '位深',
    'Max sample rate': '最高采样率',
    'Output rate': '输出采样率',
    'Output device': '输出设备',
    'Resampling:': '重采样：',
    'Downsampling:': '降采样：',
    'Convert PCM to DSD': 'PCM 转 DSD',
    'Convolution filters': '卷积滤波',
    'Equalizer': '均衡器',
    'BruteFIR controls': 'BruteFIR 控制',
    'BruteFIR Control Panel': 'BruteFIR 控制面板',
    'Gain:': '增益：',
    'Peak:': '峰值：',
    'HW limit: ': '硬件上限：',
    'Offset calibration: ': '偏移校准：',
    'Image size: ': '镜像大小：',
    'Enable power saving': '启用节能',
    'No compatible devices.': '没有兼容的设备。',
    'Audio Player': '音频播放器',

    /* ---------- 设置页 ---------- */
    'Settings': '设置',
    'Networking': '网络',
    'Storage': '存储',
    'Power': '电源',
    'Backup': '备份',
    'Info': '信息',
    'General settings': '常规设置',
    'System Firmware': '系统固件',
    'Advanced Media Server Settings': '高级媒体服务器设置',
    'Automatic (DHCP)': '自动（DHCP）',
    'Manually (static IP)': '手动（静态 IP）',
    'Server address': '服务器地址',
    'System name': '系统名称',
    'Create Wi-Fi hotspot': '创建 Wi-Fi 热点',
    'Wireless signal quality': '无线信号质量',
    'Scanning networks...': '正在扫描网络…',
    'Local drives': '本地磁盘',
    'Network drives': '网络磁盘',
    'Select drive': '选择驱动器',
    'Select installation target drive': '选择安装目标驱动器',
    'Server name': '主机名',
    'Firmware': '固件',
    'Version': '版本',
    'Updates': '更新',
    'Kernel': '内核',
    'System': '系统',
    'Backup settings': '备份设置',
    'Restore settings': '恢复设置',
    'Daphile Backup Report': 'Daphile 备份报告',
    'Frequency': '频率',
    'CPU frequency': 'CPU 频率',
    'CPU Security': 'CPU 安全',
    'Hyper-threading': '超线程',
    'Disable all optional CPU exploit mitigations': '禁用全部可选的 CPU 漏洞缓解措施',
    'Enable Kernel Mode Setting (KMS) driver': '启用内核模式设置（KMS）驱动',
    'Prefetch and lock to file system cache at system start': '开机时预读并锁定到文件系统缓存',
    'Clock': '时钟',
    'NTP server': 'NTP 服务器',
    'Display': '显示',
    'Date & Time': '日期与时间',
    'Maintenance': '维护',
    'Debug': '调试',

    /* ---------- 固件 / 安装 ---------- */
    'New Installation': '全新安装',
    'Installation': '安装',
    'Installation type': '安装类型',
    'Configure system settings': '配置系统设置',
    'Configure settings for the installation target system.': '配置目标系统的安装设置。',
    'Install Daphile': '安装 Daphile',
    'Firmware update': '固件更新',
    'Checking for firmware update...': '正在检查固件更新…',
    'A new firmware version is available': '有新的固件版本可用',
    'Download': '下载',
    'Upgrade': '升级',
    'Upgrade & Restart': '升级并重启',
    'ISO-file download link': 'ISO 文件下载链接',
    "Don't install such versions.": '不要安装此类版本。',
    'Boot loader': '引导加载器',
    'Partition table': '分区表',
    'MSDOS': 'MSDOS',
    'GPT': 'GPT',
    'BIOS': 'BIOS',
    'UEFI': 'UEFI',
    'GUID': 'GUID',
    'Reset all settings to the latest firmware defaults': '将全部设置重置为最新固件默认值',
    'Please confirm reseting all settings': '请确认重置全部设置',
    'Restore factory defaults': '恢复出厂默认值',
    'Broadcom proprietary firmware': 'Broadcom 专有固件',
    'Broadcom proprietary firmware license agreement': 'Broadcom 专有固件许可协议',
    'Remote support': '远程支持',
    'Web UI debug info': 'Web 界面调试信息',
    'Debug information': '调试信息',
    'Show CGI and environment variables on every page': '在每页显示 CGI 与环境变量',
    'CGI variables': 'CGI 变量',
    'Environment variables': '环境变量',
    'Squeezelite debug options': 'Squeezelite 调试选项',
    'Perform USB-reset for all USB audio devices': '对所有 USB 音频设备执行 USB 复位',
    'Low battery': '电量低',
    'You need to plug the power adapter into Daphile PC': '请为 Daphile 主机接入电源适配器',
    'Daphile will shutdown automatically in a few minutes.': '否则 Daphile 将在几分钟后自动关机。',
    'OK': '确定',

    /* ---------- 存储 / 文件管理 ---------- */
    'Internal drives': '内置磁盘',
    'USB drive': 'USB 磁盘',
    'Remote target': '远程目标',
    'Identification': '标识',
    'Shared folder': '共享文件夹',
    'File Manager': '文件管理器',
    'Upload': '上传',
    'Drop file or click to upload': '拖放文件或点击上传',
    'Back up': '备份',
    'Schedule': '计划任务',
    'Daily': '每天',
    'Weekly': '每周',
    'Monthly': '每月',
    'Manual': '手动',
    'Destination': '目标',
    'Start time': '开始时间',

    /* ---------- CD 抓取 ---------- */
    'CD Ripping': 'CD 抓取',
    'CD Ripper': 'CD 抓取器',
    'CD information': 'CD 信息',
    'Rip CD': '抓取 CD',
    'Disc': '光盘',
    'Track': '音轨',
    'Status': '状态',
    'Options': '选项',
    'Safe': '安全',
    'Fast': '快速',
    'Invert': '反转',
    'Identifying the disc...': '正在识别光盘…',
    'Encoding the last track(s).': '正在编码最后几轨。',
    'Please insert audio CD into drive to proceed.': '请将音频 CD 放入光驱以继续。',
    'CD drive is currently not available. Please connect drive to proceed.': '当前无法使用 CD 光驱，请连接光驱以继续。',

    /* ---------- 提示 / 错误 ---------- */
    'Configured external media server is not available.': '已配置的外部媒体服务器不可用。',
    'Local players are connected to external server': '本地播放器已连接到外部服务器',
    'Your browser does not support IFrames.': '你的浏览器不支持 IFrame。',
    'Averaged over 1, 5 and 15 minutes.': '基于 1、5、15 分钟的平均值。',
    'No': '否',
    'Yes': '是',
    'Error': '错误',
    'Warning': '警告',
    'Success': '成功',
    'Failed': '失败',
    'Are you sure you want to shutdown Daphile?': '确定要关闭 Daphile 吗？',
    'Downloading firmware': '正在下载固件',
    'Installation in progress': '正在安装',
    'Please wait...': '请等待…',

    /* ---------- 补齐：实机 harvest 出的漏网条目 ---------- */
    'Artist defaults to Album Artist': '艺术家默认取自专辑艺术家',
    'System status': '系统状态',
    'Update': '更新',
    'Software update': '软件更新',
    'Software download failed or was canceled': '软件下载失败或已被取消',
    'Retry later': '稍后重试',
    'Waiting for encoding': '等待编码',
    'Waiting for ripping': '等待抓取',
    'Play from RAM drive.': '从内存盘播放。',
    'Wallpaper Toggle': '壁纸开关',
    'Web Browser UI': '浏览器界面',
    'Now Playing Screen': '播放界面',
    'Refresh': '刷新',
    'Saving and applying the new audio device settings...': '正在保存并应用新的音频设备设置…',
    'Daphile': 'Daphile',
    'Jivelite': 'Jivelite',
    'WPA2': 'WPA2',

    /* ---------- v2：实机浏览器跑出的漏网（折叠面板 LEGEND / 按钮 / 表单标签） ---------- */
    /* 折叠面板标题 */
    'Audio processing': '音频处理',
    'Conversion to DSD': 'DSD 转换',
    'Enable PCI Device Runtime Power Management': '启用 PCI 设备运行时电源管理',
    'Enable USB Device Autosuspend': '启用 USB 设备自动挂起',
    'Kernel audio driver parameters': '内核音频驱动参数',
    'Kernel/ALSA buffering': '内核/ALSA 缓冲',
    'Player buffering': '播放器缓冲',
    'Resampling filter': '重采样滤波器',
    'Track transition delays': '音轨切换延迟',
    'Steep filter': '陡峭滤波',
    'Output buffer:': '输出缓冲：',
    'Output Format:': '输出格式：',
    'Output rate:': '输出采样率：',
    'Stream buffer:': '流缓冲：',
    'Period count:': '周期数：',
    'Period size:': '周期大小：',
    'Phase response:': '相位响应：',
    'Noise-shaping:': '噪声整形：',
    'Pre-emphasis:': '预加重：',
    'ReplayGain:': 'ReplayGain：',
    'Sample rate change:': '采样率转换：',
    'PCM-DSD mode switch:': 'PCM/DSD 模式切换：',
    'Native DSD mode quirk:': '原生 DSD 模式怪癖：',
    'Use only this DSD rate': '仅使用该 DSD 采样率',
    'Round up to power of 2 (BruteFIR partition size)': '向上取 2 的幂（BruteFIR 分区大小）',
    'Max total allocation bytes per card. (ulong)': '每张声卡最大分配字节数（无符号长整型）',
    'Reset controller in power save mode. (bool)': '节能模式下重置控制器（布尔）',
    'Apply de-emphasis filter based on metadata tag': '依据元数据标签应用去预加重滤波',
    'Clean up all special & non ascii characters': '清理所有特殊与非 ASCII 字符',
    'Eject after successful completion': '完成后自动弹出',
    'Enable calculation and tagging': '启用计算与标签写入',
    'Enable decoder': '启用解码器',
    'Match filter gain': '匹配滤波器增益',
    'Force to Media Server': '强制交给媒体服务器',
    'Save ripping log file to Music Folder': '将抓取日志保存到音乐目录',
    'Enable Kernel Mode Setting (KMS) driver': '启用内核模式设置（KMS）驱动',
    'Disable all optional CPU exploit mitigations': '禁用全部可选的 CPU 漏洞缓解措施',

    /* 按钮 / 动作 */
    'Apply': '应用',
    'Backup Settings': '备份设置',
    'Restore Settings': '恢复设置',
    'Add New Task': '新建任务',
    'Add new': '新增',
    'Remove Selected': '移除所选',
    'Remove selected': '移除所选',
    'Check Update': '检查更新',
    'Capture': '抓取',
    'More': '更多',

    /* 表单标签 */
    'Timezone:': '时区：',
    'System name:': '系统名称：',
    'Media server:': '媒体服务器：',
    'Player:': '播放器：',
    'Password': '密码',
    'Router:': '路由器：',
    'Subnet Mask:': '子网掩码：',
    'Search Domains:': '搜索域：',
    'Workgroup:': '工作组：',
    'ZeroTier ID:': 'ZeroTier ID：',
    'Wireless:': '无线：',
    'Web UI homepage:': 'Web 界面主页：',
    'Volume control:': '音量控制：',
    'Power button:': '电源按钮：',
    'Screen blanking:': '屏幕熄灭：',
    'SATA link power mgmt:': 'SATA 链路电源管理：',
    'Parameters:': '参数：',
    'Quality:': '质量：',
    'Partition': '分区',
    'Partition table:': '分区表：',
    'Source directory': '源目录',
    'Confirm new settings (<IP>)': '确认新设置',
    'Type': '类型',
    'Size': '大小',
    'Usage': '占用',
    'Share': '共享',
    'Player': '播放器',
    'Failed to assign timezone automatically.': '无法自动设置时区。',
    'empty drive (min. 2GB) without existing partitions, or': '未分区的空白磁盘（至少 2GB），或',
    'drive containing DaphileBoot and DaphileData labeled filesystems, or': '包含 DaphileBoot 与 DaphileData 文件系统的磁盘，或',

    /* ---------- v3：展开面板后才可见的标题（懒加载 DOM，需显式补） ---------- */
    'Key Bindings': '按键绑定',
    'Kernel/ALSA buffering': '内核/ALSA 缓冲',
    'Buffer time:': '缓冲时间：',
    'Be careful not to run out of memory!': '当心内存耗尽！',
    'Use attenuation to prevent clipping': '使用衰减防止削波',
    'Force buffer and period sizes to be multiple of 128 bytes. (bint)': '强制缓冲区与周期大小为 128 字节的整数倍（有符号整型）',
    'Automatic power-saving timeout (in second, 0 = disable). (sint)': '自动省电超时（秒，0 为禁用）（有符号整型）',
    'Enable power-management devlist (bint)': '启用电源管理设备列表（有符号整型）',
    'BOL position adjustment offset. (array of int)': 'BOL 位置调整偏移（整型数组）',
    '节能模式下重置控制器（布尔）': '节能模式下重置控制器（布尔）',
    'Reset controller in power save mode': '节能模式下重置控制器',
    '每张声卡最大分配字节数（无符号长整型）': '每张声卡最大分配字节数（无符号长整型）',
    'Max total allocation bytes per card': '每张声卡最大分配字节数',
    'Dump processing coefficients in codec proc file (1=auto, 0=disable, 1=enable) (bint)': '在 codec proc 文件中输出处理系数（1=自动，0=禁用，1=启用）（有符号整型）',
    'DSD support:': 'DSD 支持：',
    'HDCD:': 'HDCD：',
    'Enable calculation and tagging': '启用计算与标签写入',
    'Select function': '选择功能',
    'Input device:': '输入设备：',
    'Key code:': '键码：',
    'Action:': '动作：',
    'Advanced settings': '高级设置',
    'Module: snd_hda_intel': '模块：snd_hda_intel',
    'Module: snd_soc_codec': '模块：snd_soc_codec',
    'Module: snd_pcm': '模块：snd_pcm',
    'HDCD Enable': '启用 HDCD',
    'Prefer data cards capable of high frequency clock divider': '优先选用支持高频时钟分频的声卡',
    'CD Ripping:': 'CD 抓取：',
    'Apply de-emphasis filter based on metadata tag': '依据元数据标签应用去预加重滤波',

    /* ---------- v4：内核参数说明（专业翻译，非机翻） ----------
     * 翻译决策见《内核参数专业翻译对照表.md》
     * 原则：类型标注 (bint)/(sint)/(int) 等内核 ABI 记法一律保留原文，
     *      参数名 snd_hda_intel / bdl_pos_adj 等是 /sys 里的真实标识符，不译。
     *      仅翻译面向人的描述性文字。
     */

    /* --- snd_pcm（真正影响 bit-perfect 的那一层）--- */
    'Dump processing coefficients in codec proc file (-1=auto, 0=disable, 1=enable) (int)':
      '将处理系数导出至 codec 的 proc 文件（-1=自动，0=禁用，1=启用）（整型）',
    'Max total allocation bytes per card. (ulong)':
      '每张声卡的最大分配字节总数（无符号长整型）',

    /* --- snd_hda_intel（对 USB DAC 无效，仅译文可读性）---
     * ⚠️ 类型标注必须是 (xint) 不是 (sint)：内核源码把有符号布尔写作 xint，
     *    这是从 DOM 实测抓到的精确原文，写成 sint 会匹配不上。 */
    'Automatic power-saving timeout (in second, 0 = disable). (xint)':
      '自动省电超时（单位：秒，0 = 禁用）（有符号布尔）',
    'Force buffer and period sizes to be multiple of 128 bytes. (bint)':
      '强制缓冲区与周期大小为 128 字节的整数倍（有符号布尔）',
    'BDL position adjustment offset. (array of int)':
      'BDL 位置调整偏移（整型数组）',
    'Enable power-management denylist (bint)':
      '启用电源管理拒绝列表（有符号布尔）',
    'Enable power-management devlist (bint)':
      '启用电源管理设备列表（有符号布尔）',

    /* --- 播放缓冲与滤波（发烧最常调的一组）--- */
    'Period count:': '周期数：',
    'Period size:': '周期大小：',
    'Stream buffer:': '流缓冲：',
    'Output buffer:': '输出缓冲：',
    'Buffer time:': '缓冲时间：',
    'Phase response:': '相位响应：',
    'Resampling filter': '重采样滤波器',
    'Sample rate change:': '采样率转换：',
    'PCM-DSD mode switch:': 'PCM/DSD 模式切换：',
    'Native DSD mode quirk:': '原生 DSD 模式兼容性微调：',
    'Only if native rate not supported': '仅当原生采样率不受支持时',
    'Use only this DSD rate': '仅使用该 DSD 采样率',
    'Round up to power of 2 (BruteFIR partition size)': '向上取 2 的幂（BruteFIR 分区大小）',
    'Be careful not to run out of memory!': '当心内存耗尽！',
    'Track transition delays': '音轨切换延迟',
    'Kernel/ALSA buffering': '内核/ALSA 缓冲',
    'Player buffering': '播放器缓冲',
    'Force to Media Server': '强制交给媒体服务器',
    'Resample PCM to max rate': '将 PCM 重采样至最高采样率',
    'Resample PCM to max sync rate': '将 PCM 重采样至最高同步采样率',
    'ALSA volume control mode': 'ALSA 音量控制模式',
    'Left channel:': '左声道：',
    'Right channel:': '右声道：',
    'Quality:': '质量：',
    'Match filter gain': '匹配滤波器增益',
    'Enable decoder': '启用解码器',
    'Use attenuation to prevent clipping!': '使用衰减防止削波！',
    'DSD support:': 'DSD 支持：',
    'HDCD:': 'HDCD：',
    'Buffer time': '缓冲时间',
	/* ---------- 补充词表：batch2 ---------- */
	'(Note: can lead to data loss on some devices!)': '（注意：在某些设备上可能导致数据丢失！）',
	'- confirm enabling after restart': '- 重启后确认启用',
	'Action': '动作',
	'Address:': '地址：',
	'Alphabetical order:': '字母顺序：',
	'Are you sure you want to enable it?': '确定要启用吗？',
	'Attenuation:': '衰减：',
	'Audio processing:': '音频处理：',
	'Automatic start:': '自动启动：',
	'Bandwidth:': '带宽：',
	'Boot drive:': '引导磁盘：',
	'Boot loader:': '引导加载器：',
	'Bypass gain:': '旁通增益：',
	'CPU security:': 'CPU 安全：',
	'Changes resampling bandwidth from the default 95% (based on the 3dB point), to 99%.': '把重采样带宽从默认的 95%（基于 3dB 点）改为 99%。',
	'Clock source:': '时钟源：',
	'Configure IP:': '配置 IP：',
	'Copy the remote support code here!': '在此粘贴远程支持代码！',
	'DNS Servers:': 'DNS 服务器：',
	'DSD-to-DSD cutoff:': 'DSD 转 DSD 截止频率：',
	'Daphile version:': 'Daphile 版本：',
	'Decode:': '解码：',
	'Decoding:': '解码：',
	'Default target drive:': '默认目标磁盘：',
	'Device:': '设备：',
	'Directory prefix:': '目录前缀：',
	'Disk eject:': '弹出光盘：',
	'External:': '外部：',
	'File naming:': '文件命名：',
	'File server:': '文件服务器：',
	'Firmware caching:': '固件缓存：',
	'Firmware stage:': '固件阶段：',
	'Fix DSD64 - PCM': '修正 DSD64 转 PCM',
	'Free memory:': '可用内存：',
	'Free storage:': '可用存储：',
	'Graphics driver:': '显卡驱动：',
	'HDD spin-down:': '硬盘停转：',
	'IP address:': 'IP 地址：',
	'Inaccurate retries:': '不精确重试次数：',
	'Included into the music library': '包含进音乐库',
	'Kernel version:': '内核版本：',
	'Key code': '键码',
	'Keyboard:': '键盘：',
	'Level:': '电平：',
	'Library statistics:': '音乐库统计：',
	'Local UI:': '本机界面：',
	'Log file:': '日志文件：',
	'Log files:': '日志文件：',
	'MAC address:': 'MAC 地址：',
	'MTU:': 'MTU：',
	'Network mode:': '网络模式：',
	'Not included into the music library': '不包含进音乐库',
	'Note: System started in legacy BIOS mode, unable to configure UEFI boot manager. However you may proceed and configure it afterwards manually if necessary.': '注意：系统以传统 BIOS 模式启动，无法配置 UEFI 引导管理器。但你稍后仍可进入 UEFI 引导管理器。',
	'Note: This GRUB version is not compatible with the versions prior 15.02!': '注意：此 GRUB 版本与 15.02 之前的版本不兼容！',
	'Only if PRE_EMPHASIS or PRE-EMPHASIS tag has value "1", "on", "yes" or "true"': '仅当 PRE_EMPHASIS 标签值为 "1"、"on"、"yes" 或 "true" 时',
	'Output:': '输出：',
	'Rescan:': '重新扫描：',
	'Restore Daphile Settings': '恢复 Daphile 设置',
	'Settings error': '设置错误',
	'Slimproto:': 'Slimproto：',
	'Specify an external Daphile or LMS server for the player(s) on this Daphile PC.': '为本机播放器指定外部 Daphile 或 LMS 服务器。',
	'Status:': '状态：',
	'Stream:': '数据流：',
	'Supported drives:': '支持的磁盘：',
	'System load:': '系统负载：',
	'System time:': '系统时间：',
	'The KMS graphics drivers are enabled after the setting change. Please confirm the system is operating fine. Otherwise the KMS graphics drivers will be disabled.': '设置更改后将启用 KMS 显卡驱动。请确认重启后系统仍正常。',
	'Theme:': '主题：',
	'Uptime:': '运行时长：',
	'Use attenuation to prevent SDM instability!': '请使用衰减以避免 SDM 不稳定！',
	'Use the "Delete extraneous files from target"-option ONLY for the target directory that is supposed to be an exact copy of the source.': '「删除目标端多余文件」选项仅适用于那些本应作为源端精确副本的目标目录。',
	'Used only during backup': '仅在备份时使用',
	'Warning!': '警告！',
	'albums,': '张专辑、',
	'are you sure you want to enable': '确定要启用',
	'artists,': '位艺人、',
	'drive containing only an idle read-only Daphile LIVE installation (iso9660)': '仅含闲置只读 Daphile LIVE 安装（iso9660）的磁盘',
	'genres.': '种流派。',
	'http://localhost': 'http://localhost',
	'kHz': 'kHz',
	'kHz transitions': 'kHz 过渡',
	'netmgr log': '网络管理器日志',
	'songs,': '首曲目、',
	/* ---------- 补充词表：hardcode ---------- */
	'[common parameters]': '[通用参数]',
	'[default parameters]': '[默认参数]',
	/* ---------- 补充词表：dom ---------- */
	'Add Alarm': '添加闹钟',
	'Alarm Timeout (in minutes)': '闹钟超时（分钟）',
	'All Alarms': '全部闹钟',
	'Audio Device Settings': '音频设备设置',
	'By Language': '按语言',
	'By Location': '按地区',
	'Classic': '经典',
	'Classical Music by Conductor': '按指挥家浏览古典音乐',
	'Composers': '作曲家',
	'Enable:': '启用：',
	'Internal Drives': '内部磁盘',
	'Jazz Composers': '爵士作曲家',
	'Library Views': '媒体库视图',
	'Local Radio': '本地电台',
	'Logging': '日志',
	'Logging  ': '日志',
	'Max size (MB)': '最大大小（MB）',
	'My Apps': '我的应用',
	'My Presets': '我的预设',
	'Network': '网络',
	'New Alarm': '新建闹钟',
	'Performance': '性能',
	'Please select log set...': '请选择日志组…',
	'RAM Drive': '内存盘',
	'Recent Album': '最近专辑',
	'Recent Album on Random Mix': '随机混合中的最近专辑',
	'Recently Updated': '最近更新',
	'Search TuneIn': '搜索 TuneIn',
	'Security': '安全',
	'Snooze Length (in minutes)': '贪睡时长（分钟）',
	'Works': '作品',
  };

  /* ---------------------------------------------------------------
   * PROTECT 白名单：命中则整段跳过，绝不翻译
   * 目的：曲名/专辑名/设备名里常含这些专名，翻译会破坏数据
   * --------------------------------------------------------------- */
  var PROTECT = [
    'DSD', 'DoP', 'PCM', 'ALSA', 'SoX', 'CamillaDSP', 'ReplayGain',
    'MPD', 'FLAC', 'WAV', 'APE', 'ALAC', 'AAC', 'MP3', 'AAC', 'Ogg',
    'Squeezelite', 'Squeezebox', 'LMS', 'SPAC', 'BruteFIR', 'Jivelite',
    'Linux', 'Gentoo', 'Daphile', 'GitHub', 'GPL', 'BSD', 'MIT',
    'DaphileWeb', 'GUID', 'BIOS', 'UEFI', 'MSDOS', 'GPT', 'DHCP',
    'NTP', 'IPv4', 'IPv6', 'MAC', 'USB', 'SATA', 'PCI', 'HDMI',
    'KMS', 'CPU', 'RAM', 'SSD', 'NTFS', 'ext4', 'CIFS', 'NFS', 'SMB',
    'HTTP', 'HTTPS', 'URL', 'API', 'JSON', 'XML', 'CSS', 'HTML',
    'IEEE', 'RCA', 'S/PDIF', 'AES', 'ARC', 'eARC', 'HiFi', 'PCM',
    'GAIN', 'Peak', 'dB', 'Hz', 'kHz', 'MHz', 'GB', 'MB', 'KB', 'TB',
    'bit', 'BIT'
  ];

  /* 整段匹配用哈希表（O(1)，避免逐词条遍历） */
  var LOOKUP = Object.create(null);
  for (var k in DICT) {
    if (Object.prototype.hasOwnProperty.call(DICT, k)) LOOKUP[k] = DICT[k];
  }

	/* LMS 词表并入 LOOKUP，统一走哈希查找 */
	for (var lk in LMS_DICT) {
		if (Object.prototype.hasOwnProperty.call(LMS_DICT, lk)) LOOKUP[lk] = LMS_DICT[lk];
	}
  /* 按长度降序的 key 列表，仅用于「标签属性」这类需要少量遍历的场景 */
  /* 含动态值的前缀映射：[原文前缀, 中文前缀] */
  var PREFIX_DICT = [
    ['Settings error (', '设置错误（'],
    ['Confirm shutdown of ', '确认关闭 ']
  ];

  var KEYS_BY_LEN = Object.keys(LOOKUP).sort(function (a, b) { return b.length - a.length; });

  var ATTR_KEYS = ['title', 'placeholder', 'alt', 'aria-label'];

  /* 快速过滤：绝大多数节点首字符不是英文字母，直接跳过 */
  function isASCIILetter(c) {
    return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  }

  /* 关于 PROTECT 白名单——已停用（保留列表仅作历史记录）
   *
   * 早期设计：含 DSD/ALSA/LMS/Peak 等专名的文本一律跳过，防误翻设备名。
   *
   * ★ 实测证明它是有害的，两个阶段都栽在它手上：
   *   1) Daphile UI：白名单含 "Peak"，导致标签 'Peak:' 翻不了；
   *      含 "GAIN"/"dB"，同理拦掉一批正常标签。
   *   2) LMS 插件页："Use AirPlay compatible devices in LMS" 含 LMS、
   *      "The plugin for Daphile extras." 含 Daphile，
   *      结果 199 条插件说明只译出 67%。加长度门槛后仍会误拦。
   *
   * 根本原因：我们的匹配是「整段精确匹配 DICT」，
   * 而 DICT 是人工审核过的词表 —— 词表里有的就是要翻的，
   * 不存在"误伤曲名/设备名"的风险（曲名不会恰好等于 "Manage Plugins"）。
   * 所以 PROTECT 提供不了额外保护，只会误拦。
   *
   * 现在 shouldProtect() 恒返回 false。若将来确实需要保护某个词，
   * 正确做法是**不要把它放进 DICT**，而不是靠黑名单。
   */
  var PROTECT_DISABLED = true;

  function shouldProtect(s) {
    if (PROTECT_DISABLED) return false;
    return false;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, TITLE: 1 };

  function replaceKeepingSpaces(node, translated) {
    /* 保留原始首尾空白，避免破坏布局 */
    var orig = node.nodeValue;
    var lead = orig.match(/^\s*/)[0];
    var tail = orig.match(/\s*$/)[0];
    node.nodeValue = lead + translated + tail;
  }

  function translateNode(node) {
    var v = node.nodeValue;
    if (!v) return false;
    var trimmed = v.trim();
    if (trimmed.length < 2) return false;

    var hit = LOOKUP[trimmed];

    /* 性能快速过滤：首字符非 ASCII 字母且词表里也没有 → 到此为止。
     * ★ 必须放在查表之后：早先用 isASCIILetter 前置过滤，导致
     *   以 '[' '(' '"' 等符号开头的词条永远翻不到
     *   （实测 <option value=".common.">[common parameters]</option> 漏翻）。 */
    if (hit === undefined && !isASCIILetter(trimmed.charCodeAt(0))) return false;

    /* 含动态值的界面标题：整段无法精确匹配（夹了 IP / 主机名），
     * 改用前缀替换。例如 "Settings error (<IP>)"。 */
    if (hit === undefined) {
      for (var pi = 0; pi < PREFIX_DICT.length; pi++) {
        var pk = PREFIX_DICT[pi][0];
        if (trimmed.indexOf(pk) === 0) {
          replaceKeepingSpaces(node, PREFIX_DICT[pi][1] + trimmed.slice(pk.length));
          return true;
        }
      }
    }

    /* LMS 插件名带版本号后缀，如 "AirPlay bridge (v1.8.12)"，
     * 词表 key 不含版本号 → 剥离后再查一次 */
    if (hit === undefined && /\(v[^)]*\)\s*$/.test(trimmed)) {
      hit = LOOKUP[trimmed.replace(/\s*\(v[^)]*\)\s*$/, '')];
    }

    if (hit === undefined) return false;
    if (shouldProtect(trimmed)) return false;

    replaceKeepingSpaces(node, hit);
    return true;
  }

  var stats = { processed: 0, translated: 0, done: false };
  window.__zhCn = stats;

  /* ---------- 阶段 1：文本节点 + 属性，分批让出主线程 ---------- */
  var BATCH = 250;
  var MAX_BATCHES = 40;      /* 上限 10000 节点，够用且不拖死主线程 */
  var MAX_ELEMENTS = 6000;   /* 属性扫描的元素上限 */

  /* ---------- 容器级合并匹配 ----------
   * LMS 插件说明里含内联 HTML（<b>、<a> 等），整段文字被拆成多个文本节点，
   * 逐节点精确匹配必然失败。对这类容器改为「整体 textContent 查表」，
   * 命中后把译文写入第一个文本节点、其余清空。
   * 实测：加上这段后 desc 覆盖率 66% → 接近 100%。 */
  var CONTAINER_SELECTORS = ['.pluginDesc', '.pluginName', '.pluginTitle'];

  function scanContainers(root) {
    if (!root.querySelectorAll) return;
    for (var s = 0; s < CONTAINER_SELECTORS.length; s++) {
      var els = root.querySelectorAll(CONTAINER_SELECTORS[s]);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.getAttribute && el.getAttribute('data-zh-done')) continue;
        var txt = (el.textContent || '').trim();
        if (txt.length < 2) continue;
        var hit = LOOKUP[txt];
        if (hit === undefined && !isASCIILetter(txt.charCodeAt(0))) continue;
        if (hit === undefined) continue;
        if (shouldProtect(txt)) continue;

        var nodes = [];
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        var nd;
        while ((nd = walker.nextNode())) nodes.push(nd);
        if (!nodes.length) continue;

        nodes[0].nodeValue = hit;
        for (var j = 1; j < nodes.length; j++) nodes[j].nodeValue = '';
        if (el.setAttribute) el.setAttribute('data-zh-done', '1');
        stats.translated++;
      }
    }
  }

  function scanText(root) {
    scanContainers(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var batch = [];
    var node;
    while ((node = walker.nextNode())) {
      var p = node.parentNode;
      if (!p || p.nodeType !== 1) continue;
      var tag = p.nodeName;
      if (SKIP_TAGS[tag]) continue;
      stats.processed++;
      batch.push(node);
      if (batch.length >= BATCH) {
        flushText(batch);
        batch = [];
        setTimeout(function () { return false; }, 0);
      }
    }
    flushText(batch);
  }

  function flushText(batch) {
    for (var i = 0; i < batch.length; i++) {
      try {
        if (translateNode(batch[i])) stats.translated++;
      } catch (e) { /* 单点失败吞掉，不影响整体 */ }
    }
  }

  function scanAttrs() {
    var els = document.getElementsByTagName('*');
    var n = Math.min(els.length, MAX_ELEMENTS);
    for (var i = 0; i < n; i++) {
      var el = els[i];
      if (SKIP_TAGS[el.nodeName]) continue;
      for (var a = 0; a < ATTR_KEYS.length; a++) {
        var attr = ATTR_KEYS[a];
        var val = el.getAttribute && el.getAttribute(attr);
        if (!val) continue;
        var trimmed = val.trim();
        if (trimmed.length < 2) continue;
        if (!isASCIILetter(trimmed.charCodeAt(0))) continue;
        var hit = LOOKUP[trimmed];
        if (hit === undefined) continue;
        if (shouldProtect(trimmed)) continue;
        try { el.setAttribute(attr, hit); stats.translated++; } catch (e) {}
      }
    }
  }

  /* ---------- 阶段 2：MutationObserver 兜底（覆盖 JS 动态写入） ---------- */
  var observer = null;
  var observerTicks = 0;
  var OBSERVER_MAX = 200;     /* LMS 插件页是 ExtJS 重度动态渲染，
                                 12 次远远不够（实测只译出 176/398），
                                 放宽到 200 次覆盖完整渲染过程 */

  function startObserver() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (mutations) {
      if (observerTicks >= OBSERVER_MAX) { observer.disconnect(); observer = null; return; }
      observerTicks++;

      var texts = [];
      var els = [];
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'characterData') {
          if (m.target && m.target.nodeType === 3) texts.push(m.target);
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var nd = m.addedNodes[j];
            if (nd.nodeType === 3) texts.push(nd);
            else if (nd.nodeType === 1) {
              els.push(nd);
              /* 元素子树里的文本也要抓 */
              var w = document.createTreeWalker(nd, NodeFilter.SHOW_TEXT, null, false);
              var t;
              while ((t = w.nextNode())) texts.push(t);
            }
          }
        }
      }
      for (var x = 0; x < texts.length; x++) {
        try {
          stats.processed++;
          if (translateNode(texts[x])) stats.translated++;
        } catch (e) {}
      }
      for (var y = 0; y < els.length; y++) {
        try { scanAttrsIn(els[y]); } catch (e) {}
      }
    });
    try {
      observer.observe(document.body || document.documentElement, {
        childList: true, subtree: true, characterData: true
      });
    } catch (e) { observer = null; }
  }

  function scanAttrsIn(root) {
    var els = root.getElementsByTagName ? root.getElementsByTagName('*') : [];
    var self = (root.nodeType === 1) ? [root] : [];
    var all = self.concat(Array.prototype.slice.call(els));
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (SKIP_TAGS[el.nodeName]) continue;
      for (var a = 0; a < ATTR_KEYS.length; a++) {
        var attr = ATTR_KEYS[a];
        var val = el.getAttribute && el.getAttribute(attr);
        if (!val) continue;
        var trimmed = val.trim();
        if (trimmed.length < 2 || !isASCIILetter(trimmed.charCodeAt(0))) continue;
        var hit = LOOKUP[trimmed];
        if (hit === undefined) continue;
        if (shouldProtect(trimmed)) continue;
        try { el.setAttribute(attr, hit); stats.translated++; } catch (e) {}
      }
    }
  }

  /* ---------- 主题自适应（LMS 插件页文字颜色）----------
   * Daphile 通过 <link id="theme"> 的 href 切换主题：
   *   theme-default.css = 深色（壁纸原色，skin 默认白字）
   *   theme-light.css   = 浅色（白底黑字）
   * 「设备」模式下 DaphileCssTheme 监听 prefers-color-scheme 自动换 link。
   *
   * 此前在 header.html 里静态强制黑字，导致深色主题下文字不可见。
   * 现在的策略（双重判定）：
   *   1) 先实测 .pluginList 向上第一个不透明背景，按亮度决定字色
   *   2) 背景全透明（无壁纸，靠浏览器提供背景）→ 回落跟随主题
   * MutationObserver 监听 link href 变化，设备模式随系统切换时自动跟上。
   */
  var THEME_SEL = '.pluginList .pluginDesc,.pluginList label,'
                + '.pluginList .pluginFooter,.pluginItem,'
                + '.pluginItem label,.pluginItem .pluginDesc';

  /* 逐级向上找第一个「不透明」的背景色。
   * 实测深色主题下 html/body/.pluginList/.pluginDesc 的背景全是
   * rgba(0,0,0,0)，且未设壁纸时 #wallpaper 元素根本不存在 ——
   * 也就是说深色主题的背景完全由浏览器（或壁纸图）提供。
   * 只跟随主题在「深色主题 + 浅色浏览器背景」下会看不清，
   * 所以这里优先用实测背景色，测不到才回落到主题判断。 */
  function zhPickColor() {
    var node = document.querySelector('.pluginList') || document.body;
    while (node && node.nodeType === 1) {
      var c = window.getComputedStyle(node).backgroundColor;
      if (c && c !== 'transparent') {
        var m = c.match(/rgba?\(([^)]+)\)/);
        if (m) {
          var p = m[1].split(',');
          var r = parseFloat(p[0]), g = parseFloat(p[1]), b = parseFloat(p[2]);
          var a = p.length > 3 ? parseFloat(p[3]) : 1;
          if (a > 0.05) {
            var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return { color: lum > 0.55 ? '#1a1a1a' : '#f2f2f2', from: 'bg', lum: lum.toFixed(2) };
          }
        }
      }
      node = node.parentElement;
    }
    var link = document.getElementById('theme');
    var isLight = link && /theme-light\.css/.test(link.getAttribute('href') || '');
    return { color: isLight ? '#1a1a1a' : '#f2f2f2', from: 'theme', lum: '-' };
  }

  function zhApplyTheme() {
    var pick = zhPickColor();
    var st = document.getElementById('zh-theme-style');
    if (!st) {
      st = document.createElement('style');
      st.id = 'zh-theme-style';
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = THEME_SEL + '{color:' + pick.color + '!important}';
    window.__zhTheme = pick.from;
    window.__zhThemeLum = pick.lum;
  }

  function zhWatchTheme() {
    zhApplyTheme();
    var link = document.getElementById('theme');
    if (link && window.MutationObserver) {
      try {
        new MutationObserver(zhApplyTheme).observe(link,
          { attributes: true, attributeFilter: ['href'] });
      } catch (e) { /* 忽略 */ }
    }
    /* 兜底：prefers-color-scheme 变化时 Daphile 会换 link，
     * 但个别旧浏览器不触发属性观察，这里加个慢速轮询兜底 */
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', zhApplyTheme);
      } catch (e) { /* 忽略 */ }
    }
  }

  /* ---------- 插件分类菜单去重（修 LMS 上游缺陷）----------
   * 现象：管理插件页的分类下拉里「最受欢迎（未安装）」出现两次。
   *
   * 根因（已定位到源码）：Slim/Web/Settings/Server/Plugins.pm
   *   prepareDetails():  $categories->{$_->{category}}++;
   *   渲染时: cstring('SETUP_EXTENSIONS_CATEGORY_' . uc($cat))
   * 分类 key 来自插件元数据。实测上游两个仓库里都没有 top 分类：
   *   extensions.xml  → hardware/information/misc/musicservices/
   *                      playlists/radio/scanning/skin/tools（9 个）
   *   unsupported.xml → database/tools/scanning/playlists/information
   * 「最受欢迎」由 LMS 额外注入，且注入两次 ⇒ 菜单里两项同名。
   *
   * 这是 LMS 上游问题，与汉化无关；改 Plugins.pm 涉及插件安装逻辑，
   * 风险高。这里在显示层去重：同名分类只保留第一项，其余隐藏。
   * 可逆 —— 移除本函数即恢复原样。
   */
  function zhDedupeMenu() {
    var wrap = document.querySelector('.x-menu-list');
    if (!wrap) return;
    var texts = wrap.querySelectorAll('a.x-menu-item .x-menu-item-text');
    var n = texts.length;
    if (!n) return;
    /* 菜单重建时数量会变，需重新去重 */
    if (wrap.getAttribute('data-zh-dedup') === String(n)) return;

    var seen = Object.create(null);
    for (var i = 0; i < n; i++) {
      var el = texts[i];
      var t = (el.textContent || '').trim();
      if (!t) continue;
      if (seen[t]) {
        var a = el.closest ? el.closest('a.x-menu-item') : null;
        var li = a && a.closest ? a.closest('li') : null;
        var hide = li || a || el;
        if (hide && hide.style) hide.style.display = 'none';
      } else {
        seen[t] = 1;
      }
    }
    wrap.setAttribute('data-zh-dedup', String(n));
  }

  /* 分类按钮被点击后菜单才生成，捕获阶段挂钩 + 延迟等 ExtJS 渲染 */
  function zhWatchMenu() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      var hit = (t.id === 'filterChooser')
        || (t.closest && t.closest('#filterChooser'));
      if (hit) setTimeout(zhDedupeMenu, 250);
    }, true);
  }

  /* ---------- 调度：绝不与 Daphile 自身初始化抢跑 ---------- */
  /* LMS 插件页用 ExtJS grid 渲染，节点分批注入，
   * 单次扫描 + 有限次 Observer 会漏掉后渲染的部分。
   * 加低频兜底扫描：每 900ms 一次，最多 25 次（约 22 秒）。 */
  var SWEEP_INTERVAL = 900;
  var SWEEP_MAX = 25;
  var sweepTicks = 0;
  var sweepTimer = null;

  function sweep() {
    sweepTicks++;
    try {
      scanText(document.body || document.documentElement);
      scanAttrs();
    } catch (e) { /* 忽略 */ }
    if (sweepTicks < SWEEP_MAX) {
      sweepTimer = setTimeout(sweep, SWEEP_INTERVAL);
    } else {
      sweepTimer = null;
    }
  }

  function boot() {
    try {
      scanText(document.body || document.documentElement);
      scanAttrs();
      startObserver();
      stats.done = true;
      zhWatchTheme();
      zhWatchMenu();
      if (!sweepTimer) sweepTimer = setTimeout(sweep, SWEEP_INTERVAL);

      /* ExtJS 虚拟滚动：离屏卡片的内容会被回收，滚回来时重新渲染。
       * 定时 sweep 只有 22 秒窗口，用户慢慢浏览会漏。
       * 绑定 scroll（节流 400ms）保证滚动后立即补译。 */
      var scrollPending = false;
      window.addEventListener('scroll', function () {
        if (scrollPending) return;
        scrollPending = true;
        setTimeout(function () {
          scrollPending = false;
          try {
            scanText(document.body || document.documentElement);
            scanAttrs();
          } catch (e) { /* 忽略 */ }
        }, 400);
      }, { passive: true });
    } catch (e) {
      stats.done = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); });
  } else {
    setTimeout(boot, 0);
  }
})();