// Configuration
const FIRST_EPISODE_DATE = "2025-03-12"; // First episode date (YYYY-MM-DD)
const EPISODE_START_TIME = "23:13"; // Episode start time (HH:mm)
const EPISODE_DURATION_MINUTES = 2; // Episode duration
const EPISODE_DAY = 3; // 6 = Saturday
const TOTAL_EPISODES = 10;

export function getEpisodeInfo() {
  const now = new Date();
  const [year, month, day] = FIRST_EPISODE_DATE.split("-").map((num) =>
    parseInt(num)
  );
  const [hours, minutes] = EPISODE_START_TIME.split(":").map((num) =>
    parseInt(num)
  );

  // Create first episode date in local timezone
  const firstEpisode = new Date(year, month - 1, day, hours, minutes, 0);
  const firstEpisodeEnd = new Date(
    firstEpisode.getTime() + EPISODE_DURATION_MINUTES * 60000
  );

  // If we're past the first episode's end time, we're in episode 2
  const isPastFirstEpisodeEnd = now > firstEpisodeEnd;

  // Calculate current episode
  const diffTime = now - firstEpisode;
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  var currentEpisode = Math.max(
    1,
    Math.min(diffWeeks + (isPastFirstEpisodeEnd ? 2 : 1), TOTAL_EPISODES)
  );

  // Calculate episode timing
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const episodeStartMinutes = hours * 60 + minutes;
  const episodeEndMinutes = episodeStartMinutes + EPISODE_DURATION_MINUTES;

  // Check if we're during an episode
  const isDuringEpisode =
    (currentDay === EPISODE_DAY ||
      (currentDay === 0 && currentTime < episodeEndMinutes)) &&
    currentTime >= episodeStartMinutes;

  // Calculate when voting will be allowed again
  const votingResumesDate = new Date(now);
  if (isDuringEpisode) {
    // If during episode, set to episode end time
    votingResumesDate.setHours(Math.floor(episodeEndMinutes / 60));
    votingResumesDate.setMinutes(episodeEndMinutes % 60);
    votingResumesDate.setSeconds(0);
  }

  // Calculate next episode date
  const nextEpisodeDate = new Date(now);
  if (currentDay === EPISODE_DAY && currentTime > episodeEndMinutes) {
    // If after episode end, next episode is next week
    nextEpisodeDate.setDate(nextEpisodeDate.getDate() + 7);
  }
  nextEpisodeDate.setDate(
    nextEpisodeDate.getDate() +
      ((EPISODE_DAY + 7 - nextEpisodeDate.getDay()) % 7)
  );
  nextEpisodeDate.setHours(hours);
  nextEpisodeDate.setMinutes(minutes);
  nextEpisodeDate.setSeconds(0);

  return {
    currentEpisode,
    isDuringEpisode,
    nextEpisodeDate,
    votingResumesDate,
    episodeDay: EPISODE_DAY,
    episodeTime: EPISODE_START_TIME,
    episodeDuration: EPISODE_DURATION_MINUTES,
    isVotingAllowed: !isDuringEpisode && currentEpisode <= TOTAL_EPISODES,
    debug: {
      now: now.toLocaleString(),
      firstEpisode: firstEpisode.toLocaleString(),
      firstEpisodeEnd: firstEpisodeEnd.toLocaleString(),
      isPastFirstEpisodeEnd,
      currentDay,
      currentTime,
      episodeStartMinutes,
      episodeEndMinutes,
    },
  };
}

// Helper function to format date and time nicely
export function formatDateTime(date) {
  return date.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
