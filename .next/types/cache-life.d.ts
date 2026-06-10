// Type definitions for Next.js cacheLife configs

declare module 'next/cache' {
  export { unstable_cache } from 'next/dist/server/web/spec-extension/unstable-cache'
  export {
<<<<<<< HEAD
    updateTag,
    revalidateTag,
    revalidatePath,
    refresh,
=======
    revalidateTag,
    revalidatePath,
    unstable_expireTag,
    unstable_expirePath,
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
  } from 'next/dist/server/web/spec-extension/revalidate'
  export { unstable_noStore } from 'next/dist/server/web/spec-extension/unstable-no-store'

  
    /**
     * Cache this `"use cache"` for a timespan defined by the `"default"` profile.
     * ```
     *   stale:      300 seconds (5 minutes)
     *   revalidate: 900 seconds (15 minutes)
     *   expire:     never
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 15 minutes, start revalidating new values in the background.
     * It lives for the maximum age of the server cache. If this entry has no traffic for a while, it may serve an old value the next request.
     */
<<<<<<< HEAD
    export function cacheLife(profile: "default"): void
=======
    export function unstable_cacheLife(profile: "default"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` for a timespan defined by the `"seconds"` profile.
     * ```
     *   stale:      30 seconds
     *   revalidate: 1 seconds
     *   expire:     60 seconds (1 minute)
     * ```
     * 
     * This cache may be stale on clients for 30 seconds before checking with the server.
     * If the server receives a new request after 1 seconds, start revalidating new values in the background.
     * If this entry has no traffic for 1 minute it will expire. The next request will recompute it.
     */
<<<<<<< HEAD
    export function cacheLife(profile: "seconds"): void
=======
    export function unstable_cacheLife(profile: "seconds"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` for a timespan defined by the `"minutes"` profile.
     * ```
     *   stale:      300 seconds (5 minutes)
     *   revalidate: 60 seconds (1 minute)
     *   expire:     3600 seconds (1 hour)
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 1 minute, start revalidating new values in the background.
     * If this entry has no traffic for 1 hour it will expire. The next request will recompute it.
     */
<<<<<<< HEAD
    export function cacheLife(profile: "minutes"): void
=======
    export function unstable_cacheLife(profile: "minutes"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` for a timespan defined by the `"hours"` profile.
     * ```
     *   stale:      300 seconds (5 minutes)
     *   revalidate: 3600 seconds (1 hour)
     *   expire:     86400 seconds (1 day)
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 1 hour, start revalidating new values in the background.
     * If this entry has no traffic for 1 day it will expire. The next request will recompute it.
     */
<<<<<<< HEAD
    export function cacheLife(profile: "hours"): void
=======
    export function unstable_cacheLife(profile: "hours"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` for a timespan defined by the `"days"` profile.
     * ```
     *   stale:      300 seconds (5 minutes)
     *   revalidate: 86400 seconds (1 day)
     *   expire:     604800 seconds (1 week)
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 1 day, start revalidating new values in the background.
     * If this entry has no traffic for 1 week it will expire. The next request will recompute it.
     */
<<<<<<< HEAD
    export function cacheLife(profile: "days"): void
=======
    export function unstable_cacheLife(profile: "days"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` for a timespan defined by the `"weeks"` profile.
     * ```
     *   stale:      300 seconds (5 minutes)
     *   revalidate: 604800 seconds (1 week)
<<<<<<< HEAD
     *   expire:     2592000 seconds (1 month)
=======
     *   expire:     2592000 seconds (30 days)
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 1 week, start revalidating new values in the background.
<<<<<<< HEAD
     * If this entry has no traffic for 1 month it will expire. The next request will recompute it.
     */
    export function cacheLife(profile: "weeks"): void
=======
     * If this entry has no traffic for 30 days it will expire. The next request will recompute it.
     */
    export function unstable_cacheLife(profile: "weeks"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` for a timespan defined by the `"max"` profile.
     * ```
     *   stale:      300 seconds (5 minutes)
<<<<<<< HEAD
     *   revalidate: 2592000 seconds (1 month)
     *   expire:     31536000 seconds (365 days)
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 1 month, start revalidating new values in the background.
     * If this entry has no traffic for 365 days it will expire. The next request will recompute it.
     */
    export function cacheLife(profile: "max"): void
=======
     *   revalidate: 2592000 seconds (30 days)
     *   expire:     never
     * ```
     * 
     * This cache may be stale on clients for 5 minutes before checking with the server.
     * If the server receives a new request after 30 days, start revalidating new values in the background.
     * It lives for the maximum age of the server cache. If this entry has no traffic for a while, it may serve an old value the next request.
     */
    export function unstable_cacheLife(profile: "max"): void
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
    
    /**
     * Cache this `"use cache"` using a custom timespan.
     * ```
     *   stale: ... // seconds
     *   revalidate: ... // seconds
     *   expire: ... // seconds
     * ```
     *
     * This is similar to Cache-Control: max-age=`stale`,s-max-age=`revalidate`,stale-while-revalidate=`expire-revalidate`
     *
     * If a value is left out, the lowest of other cacheLife() calls or the default, is used instead.
     */
<<<<<<< HEAD
    export function cacheLife(profile: {
=======
    export function unstable_cacheLife(profile: {
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
      /**
       * This cache may be stale on clients for ... seconds before checking with the server.
       */
      stale?: number,
      /**
       * If the server receives a new request after ... seconds, start revalidating new values in the background.
       */
      revalidate?: number,
      /**
       * If this entry has no traffic for ... seconds it will expire. The next request will recompute it.
       */
      expire?: number
    }): void
  

<<<<<<< HEAD
  import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
  export { cacheTag }

  export const unstable_cacheTag: typeof cacheTag
  export const unstable_cacheLife: typeof cacheLife
=======
  export { cacheTag as unstable_cacheTag } from 'next/dist/server/use-cache/cache-tag'
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
}
