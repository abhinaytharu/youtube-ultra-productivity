// YouTube Element Selectors
// Comprehensive list of selectors for all major YouTube UI elements
// Use these selectors to target specific components for styling or manipulation

// ------------------------------
// Header and Navigation
// ------------------------------
const logo = document.querySelector('#logo'); // YouTube logo
const logoIcon = document.querySelector('#logo-icon'); // YouTube logo icon
const logoIconContainer = document.querySelector('#logo-icon-container'); // Logo container
const searchBar = document.querySelector('input#search'); // Search input field
const searchButton = document.querySelector('#search-icon-legacy'); // Search button
const searchForm = document.querySelector('#search-form'); // Search form container
const voiceSearchButton = document.querySelector('#voice-search-button'); // Voice search button
const profileIcon = document.querySelector('button#avatar-btn'); // Profile picture / account button
const profileMenu = document.querySelector('#avatar-menu'); // Profile dropdown menu
const createButton = document.querySelector('#create-icon'); // Create button (upload)
const createMenu = document.querySelector('#create-menu'); // Create dropdown menu
const notificationsButton = document.querySelector('#notification-button'); // Notifications bell
const appsButton = document.querySelector('#guide-button'); // Apps/menu button
const masthead = document.querySelector('ytd-masthead'); // Main header container
const mastheadContainer = document.querySelector('#masthead-container'); // Header container

// ------------------------------
// Sidebar Menu (Guide)
// ------------------------------
const guideRenderer = document.querySelector('ytd-guide-renderer'); // Main sidebar
const guideInnerContent = document.querySelector('#guide-inner-content'); // Sidebar content
const guideHome = document.querySelector('a[title="Home"]'); // Home link
const guideShorts = document.querySelector('a[title="Shorts"]'); // Shorts link
const guideSubscriptions = document.querySelector('a[title="Subscriptions"]'); // Subscriptions link
const guideLibrary = document.querySelector('a[title="Library"]'); // Library link
const guideHistory = document.querySelector('a[title="History"]'); // History link
const guideWatchLater = document.querySelector('a[title="Watch later"]'); // Watch later link
const guideLikedVideos = document.querySelector('a[title="Liked videos"]'); // Liked videos link
const guideTrending = document.querySelector('a[title="Trending"]'); // Trending link
const guideMusic = document.querySelector('a[title="Music"]'); // Music link
const guideGaming = document.querySelector('a[title="Gaming"]'); // Gaming link
const guideNews = document.querySelector('a[title="News"]'); // News link
const guideSports = document.querySelector('a[title="Sports"]'); // Sports link
const guideLearning = document.querySelector('a[title="Learning"]'); // Learning link
const guideFashion = document.querySelector('a[title="Fashion & Beauty"]'); // Fashion link
const miniGuide = document.querySelector('ytd-mini-guide-renderer'); // Mini sidebar for mobile

// ------------------------------
// Video Player Area
// ------------------------------
const playerContainer = document.querySelector('#player'); // Main player container
const playerContainerOuter = document.querySelector('#player-container-outer'); // Outer player wrapper
const moviePlayer = document.querySelector('#movie_player'); // Video player element
const html5VideoPlayer = document.querySelector('.html5-video-player'); // HTML5 video player
const videoElement = document.querySelector('video'); // Actual video element
const playerTheaterContainer = document.querySelector('#player-theater-container'); // Theater mode container
const watchFlexy = document.querySelector('ytd-watch-flexy'); // Watch page container

// Player Controls
const playerControls = document.querySelector('.ytp-chrome-bottom'); // Bottom control bar
const playerTopControls = document.querySelector('.ytp-chrome-top'); // Top control bar
const playButton = document.querySelector('.ytp-play-button'); // Play/pause button
const progressBar = document.querySelector('.ytp-progress-bar'); // Progress bar
const progressBarContainer = document.querySelector('.ytp-progress-bar-container'); // Progress container
const timeDisplay = document.querySelector('.ytp-time-display'); // Time display
const currentTime = document.querySelector('.ytp-current-time'); // Current time
const duration = document.querySelector('.ytp-duration'); // Video duration
const volumeButton = document.querySelector('.ytp-mute-button'); // Volume button
const volumeSlider = document.querySelector('.ytp-volume-panel'); // Volume slider
const settingsButton = document.querySelector('.ytp-settings-button'); // Settings button
const fullscreenButton = document.querySelector('.ytp-fullscreen-button'); // Fullscreen button
const theaterButton = document.querySelector('.ytp-size-button'); // Theater mode button
const qualityButton = document.querySelector('.ytp-quality-button'); // Quality button
const captionsButton = document.querySelector('.ytp-subtitles-button'); // Captions button
const speedButton = document.querySelector('.ytp-playback-rate-button'); // Playback speed button
const leftControls = document.querySelector('.ytp-left-controls'); // Left control group
const rightControls = document.querySelector('.ytp-right-controls'); // Right control group

// ------------------------------
// Video Info and Buttons
// ------------------------------
const videoTitle = document.querySelector('h1.title'); // Video title
const videoTitleContainer = document.querySelector('#title'); // Title container
const videoInfo = document.querySelector('#info'); // Video info section
const videoInfoContents = document.querySelector('#info-contents'); // Info contents
const videoMeta = document.querySelector('#meta'); // Video metadata
const videoMetaContents = document.querySelector('#meta-contents'); // Meta contents
const videoSecondaryInfo = document.querySelector('ytd-video-secondary-info-renderer'); // Secondary info
const videoDescription = document.querySelector('#description'); // Video description
const videoDescriptionText = document.querySelector('#description-text'); // Description text
const videoDescriptionMore = document.querySelector('#more'); // Show more button
const videoDescriptionLess = document.querySelector('#less'); // Show less button

// Action Buttons
const likeButton = document.querySelector('#top-level-buttons-computed #segmented-like-button'); // Like button
const dislikeButton = document.querySelector('#top-level-buttons-computed #segmented-dislike-button'); // Dislike button
const shareButton = document.querySelector('#top-level-buttons-computed #segmented-share-button'); // Share button
const saveButton = document.querySelector('#top-level-buttons-computed #segmented-save-button'); // Save button
const subscribeButton = document.querySelector('#subscribe-button'); // Subscribe button
const subscribeButtonPaper = document.querySelector('ytd-subscribe-button-renderer tp-yt-paper-button'); // Subscribe paper button
const bellButton = document.querySelector('#notification-preference-button'); // Notification bell
const joinButton = document.querySelector('#join-button'); // Join button (membership)

// Video Stats
const viewCount = document.querySelector('#count'); // View count
const likeCount = document.querySelector('#segmented-like-button #text'); // Like count
const dislikeCount = document.querySelector('#segmented-dislike-button #text'); // Dislike count

// ------------------------------
// Comments Section
// ------------------------------
const commentsSection = document.querySelector('#comments'); // Comments container
const commentsHeader = document.querySelector('#comments-header'); // Comments header
const commentsTitle = document.querySelector('#comments-title'); // Comments title
const commentsContents = document.querySelector('#contents'); // Comments contents
const commentThreads = document.querySelectorAll('ytd-comment-thread-renderer'); // Individual comment threads
const commentBox = document.querySelector('#simple-box'); // Comment input box
const commentSubmitButton = document.querySelector('#submit-button'); // Submit comment button
const sortCommentsButton = document.querySelector('#sort-menu-button'); // Sort comments button
const commentsCount = document.querySelector('#count-text'); // Comments count

// ------------------------------
// Suggested Videos / Sidebar
// ------------------------------
const secondary = document.querySelector('#secondary'); // Right sidebar
const secondaryInner = document.querySelector('#secondary-inner'); // Sidebar inner content
const relatedVideos = document.querySelector('#related'); // Related videos section
const watchNextResults = document.querySelector('ytd-watch-next-secondary-results-renderer'); // Watch next results
const compactVideoRenderers = document.querySelectorAll('ytd-compact-video-renderer'); // Compact video items
const playlistPanel = document.querySelector('ytd-playlist-panel-renderer'); // Playlist panel
const playlistItems = document.querySelectorAll('ytd-playlist-video-renderer'); // Playlist items

// ------------------------------
// Channel Page
// ------------------------------
const channelHeader = document.querySelector('ytd-channel-header-renderer'); // Channel header
const channelName = document.querySelector('#channel-name'); // Channel name
const channelSubscriberCount = document.querySelector('#subscriber-count'); // Subscriber count
const channelDescription = document.querySelector('#description'); // Channel description
const channelTabs = document.querySelector('#tabs'); // Channel tabs
const channelHomeTab = document.querySelector('#tabs #tabsContent #home'); // Home tab
const channelVideosTab = document.querySelector('#tabs #tabsContent #videos'); // Videos tab
const channelPlaylistsTab = document.querySelector('#tabs #tabsContent #playlists'); // Playlists tab
const channelShortsTab = document.querySelector('#tabs #tabsContent #shorts'); // Shorts tab
const channelLiveTab = document.querySelector('#tabs #tabsContent #live'); // Live tab
const channelAboutTab = document.querySelector('#tabs #tabsContent #about'); // About tab

// ------------------------------
// Shorts Page
// ------------------------------
const shortsContainer = document.querySelector('ytd-shorts'); // Shorts container
const shortsPlayer = document.querySelector('ytd-shorts-player'); // Shorts player
const shortsVideo = document.querySelector('ytd-shorts video'); // Shorts video element
const shortsInfo = document.querySelector('ytd-shorts-info-renderer'); // Shorts info
const shortsTitle = document.querySelector('#title'); // Shorts title
const shortsChannel = document.querySelector('#channel-name'); // Shorts channel
const shortsLikeButton = document.querySelector('#like-button'); // Shorts like button
const shortsDislikeButton = document.querySelector('#dislike-button'); // Shorts dislike button
const shortsShareButton = document.querySelector('#share-button'); // Shorts share button
const shortsCommentButton = document.querySelector('#comment-button'); // Shorts comment button
const shortsMoreButton = document.querySelector('#more-button'); // Shorts more button

// ------------------------------
// Search Results
// ------------------------------
const searchResults = document.querySelector('#contents'); // Search results container
const searchFilters = document.querySelector('#filter-menu'); // Search filters
const searchFilterButton = document.querySelector('#filter-button'); // Filter button
const searchSortButton = document.querySelector('#sort-menu-button'); // Sort button
const searchResultItems = document.querySelectorAll('ytd-video-renderer'); // Video result items
const searchChannelItems = document.querySelectorAll('ytd-channel-renderer'); // Channel result items
const searchPlaylistItems = document.querySelectorAll('ytd-playlist-renderer'); // Playlist result items

// ------------------------------
// Home Page / Feed
// ------------------------------
const pageManager = document.querySelector('#page-manager'); // Page manager
const primary = document.querySelector('#primary'); // Primary content area
const columns = document.querySelector('#columns'); // Main columns container
const richGridRenderer = document.querySelector('ytd-rich-grid-renderer'); // Rich grid (home feed)
const richItemRenderers = document.querySelectorAll('ytd-rich-item-renderer'); // Rich items
const gridVideoRenderers = document.querySelectorAll('ytd-grid-video-renderer'); // Grid video items
const videoRenderers = document.querySelectorAll('ytd-video-renderer'); // Video items
const shelfRenderers = document.querySelectorAll('ytd-shelf-renderer'); // Shelf sections

// ------------------------------
// General Elements (Thumbnails, Buttons, Icons)
// ------------------------------
const thumbnails = document.querySelectorAll('ytd-thumbnail img'); // All thumbnails
const thumbnailContainers = document.querySelectorAll('ytd-thumbnail'); // Thumbnail containers
const videoTitles = document.querySelectorAll('#video-title'); // All video titles
const channelNames = document.querySelectorAll('#channel-name'); // All channel names
const viewCounts = document.querySelectorAll('#metadata-line span'); // All view counts
const videoDurations = document.querySelectorAll('.ytd-thumbnail-overlay-time-status-renderer'); // Video durations
const paperButtons = document.querySelectorAll('tp-yt-paper-button'); // Paper buttons
const paperIconButtons = document.querySelectorAll('tp-yt-paper-icon-button'); // Paper icon buttons
const menuButtons = document.querySelectorAll('ytd-menu-renderer'); // Menu buttons
const popupContainers = document.querySelectorAll('ytd-popup-container'); // Popup containers
const dialogs = document.querySelectorAll('tp-yt-paper-dialog'); // Dialog boxes
const toasts = document.querySelectorAll('ytd-toast'); // Toast notifications

// ------------------------------
// Live Chat (Live Streams)
// ------------------------------
const liveChat = document.querySelector('ytd-live-chat-renderer'); // Live chat container
const liveChatFrame = document.querySelector('#chatframe'); // Live chat iframe
const liveChatMessages = document.querySelectorAll('ytd-live-chat-text-message-renderer'); // Chat messages
const liveChatInput = document.querySelector('#input'); // Chat input
const liveChatSendButton = document.querySelector('#send-button'); // Send button
const liveChatMembership = document.querySelector('ytd-live-chat-membership-item-renderer'); // Membership messages
const liveChatSuperChat = document.querySelector('ytd-live-chat-paid-message-renderer'); // Super chat messages

// ------------------------------
// Mobile Elements
// ------------------------------
const mobileGuide = document.querySelector('ytd-mini-guide-renderer'); // Mobile mini guide
const mobilePlayer = document.querySelector('ytd-player'); // Mobile player
const mobileControls = document.querySelector('.ytp-mobile-controls'); // Mobile controls
const mobileProgressBar = document.querySelector('.ytp-mobile-progress-bar'); // Mobile progress bar

// ------------------------------
// Utility Functions
// ------------------------------
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

function isShortsPage() {
    return window.location.pathname.includes('/shorts/');
}

function isChannelPage() {
    return window.location.pathname.includes('/channel/') || window.location.pathname.includes('/c/') || window.location.pathname.includes('/user/');
}

function isSearchPage() {
    return window.location.pathname === '/results' || window.location.search.includes('search_query');
}

function isHomePage() {
    return window.location.pathname === '/' || window.location.pathname === '/feed/';
}

// Export selectors for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Header
        logo, searchBar, searchButton, profileIcon, createButton, notificationsButton,
        // Sidebar
        guideRenderer, guideHome, guideShorts, guideSubscriptions, guideLibrary,
        // Player
        playerContainer, moviePlayer, videoElement, playButton, progressBar,
        // Video Info
        videoTitle, likeButton, subscribeButton, viewCount,
        // Comments
        commentsSection, commentThreads, commentBox,
        // Sidebar
        secondary, relatedVideos, compactVideoRenderers,
        // Channel
        channelHeader, channelName, channelTabs,
        // Shorts
        shortsContainer, shortsPlayer, shortsVideo,
        // Search
        searchResults, searchResultItems,
        // General
        thumbnails, videoTitles, channelNames,
        // Utility functions
        getVideoId, isShortsPage, isChannelPage, isSearchPage, isHomePage
    };
}
