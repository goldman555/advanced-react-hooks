import React from 'react'

// if there have been 20 calls of a given effect in 3 seconds then that's probably a runaway
const RECORDS = 20
const TIME_LIMIT = 3000

if (process.env.NODE_ENV !== 'production') {
  throttleEffectHook('useEffect')
  throttleEffectHook('useLayoutEffect')
}

function throttleEffectHook(hookName) {
  const originalHook = React[hookName]
  React[hookName] = function useThrottledHook(...args) {
    const ref = React.useRef([])
    const calls = ref.current
    const oldestCall = calls.slice(-1)[0]
    const now = Date.now()
    calls.push({time: now, args})
    if (calls.length >= RECORDS && oldestCall.time > now - TIME_LIMIT) {
      const allRecentCallDependencies = calls.map(c => c.args[1])
      const messages = [
        `The following effect callback was invoked ${RECORDS} times in ${TIME_LIMIT}ms`,
        '\n',
        args[0].toString(),
      ]
      if (allRecentCallDependencies.some(Boolean)) {
        messages.push(
          '\n',
          `Here are the arguments this effect was called with recently:`,
          allRecentCallDependencies,
        )
        if (allRecentCallDependencies.some(deps => !deps.every(isPrimitive))) {
          messages.push(
            '\n',
            `It looks like some of these values are not primitive values. If those objects/arrays/functions are initialized during rendering, you need to memoize them using React.useMemo or React.useCallback`,
          )
        }
      } else {
        messages.push(
          '\n',
          `This effect is not called with a dependencies argument and probably should. Start by adding \`[]\` as a second argument to the ${hookName} call, then add any other dependencies as elements to that array.`,
        )
      }
      console.warn(...messages)
      throw new Error(
        `Uh oh... Looks like we've got a runaway ${hookName}. Check the console for more info. Make sure the ${hookName} is being passed the right dependencies. (Note, this error message is from Kent, not React 👋)`,
      )
    }
    ref.current = calls.slice(0, RECORDS)
    return originalHook.apply(React, args)
  }
}

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val)
}
