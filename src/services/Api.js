const API_BASE_URL = 'https://tgapp.eonx.ai/';

export const PUBLIC_URL = 'https://tgapp.eonx.ai';

export const AUTH_USER = `${API_BASE_URL}api/users/auth`
export const CHECK_USER_TG_CHANNEL_JOINED = `${API_BASE_URL}api/activity/if_user_join_tg_channel`

export const GET_USER = `${API_BASE_URL}api/users/get_user`

export const ENCRYPTED_USER_DATA = `${API_BASE_URL}api/users/encrypt-user-data`
export const DECRYPTED_USER_DATA = `${API_BASE_URL}api/users/decrypt-user-data`

export const VALIDATE_CODE_API = `${API_BASE_URL}api/tasks/validate-code`

export const GET_TASKS = `${API_BASE_URL}api/tasks`

export const GET_TASK_BY_ID = `${API_BASE_URL}api/tasks/`

export const START_MISSION = `${API_BASE_URL}api/activity/start`

export const CLICK_MISSION = `${API_BASE_URL}api/activity/click_perform`

export const FINISH_MISSION = `${API_BASE_URL}api/activity/complete`

export const CLAIM_REWARD = `${API_BASE_URL}api/activity/claim`

export const GET_LEADERBOARD = `${API_BASE_URL}api/users/leaderboard`

export const INVITE_API = `${API_BASE_URL}api/users/invite-screen`

export const ISSUE_TRACK = `${API_BASE_URL}api/users/record-issue`

export const GET_SPIN_WHEEL = `${API_BASE_URL}api/wheel/spin-wheel`

export const GET_USER_FUEL = `${API_BASE_URL}api/tapping/fuel`

export const USER_TAP = `${API_BASE_URL}api/tapping/tap`;

export const USER_REWARD_HISTORY = `${API_BASE_URL}api/users/reward-history`;
export const PAID_REWARD_HISTORY = `${API_BASE_URL}api/users/paid-reward-history`;


export const USER_ACCEPT_TERMS = `${API_BASE_URL}api/users/accept-terms`;

export const UPDATE_PACKAGE_STATUS = `${API_BASE_URL}api/users/change-to-premium`;

export const GENERATE_SIGNATURE = `${API_BASE_URL}api/users/generate-signature`;

export const CLAIM_DAILY_LOGIN = `${API_BASE_URL}api/daily-login`;
export const GET_STREAK_STATUS = `${API_BASE_URL}api/daily-login/status`;
export const GET_STREAK_HISTORY = `${API_BASE_URL}api/daily-login/history`;

export const GET_ANNOUNCEMENTS = `${API_BASE_URL}api/notifications/`;
export const MARK_ALL_UNREAD_AS_READ = `${API_BASE_URL}api/notifications/mark-all-unread-as-read`;
export const GET_UNREAD_COUNT = `${API_BASE_URL}api/notifications/unread-count`;

export const GET_SHARE_TASKS = `${API_BASE_URL}api/share-tasks`;
export const GET_SHARE_TASK = `${API_BASE_URL}api/share-tasks/link`;

export const GET_SHARE_LEADERBOARD = `${API_BASE_URL}api/share-tasks/share/leaderboard`;

