const EXTENSION_INITIATOR_RULE_ID = 9001
const TAB_RULE_ID = 9002

const RESPONSE_HEADERS: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [
  { header: "X-Frame-Options", operation: "remove" },
  { header: "Content-Security-Policy", operation: "remove" },
]

function modifyHeadersRule(
  id: number,
  condition: chrome.declarativeNetRequest.RuleCondition
): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: RESPONSE_HEADERS,
    },
    condition,
  }
}

/**
 * Let PegBoard iframes load sites that send X-Frame-Options or frame-ancestors.
 * Scoped to this extension (initiator), plus the current tab when we can see it.
 * chrome.tabs.query({ active: true }) misses the new-tab page, so it cannot be the only path.
 */
export async function enableIframeEmbedHeaders(): Promise<void> {
  const dnr = chrome.declarativeNetRequest
  if (!dnr?.updateSessionRules) return

  const rules: chrome.declarativeNetRequest.Rule[] = [
    modifyHeadersRule(EXTENSION_INITIATOR_RULE_ID, {
      initiatorDomains: [chrome.runtime.id],
      resourceTypes: ["sub_frame"],
    }),
  ]

  let currentTab: chrome.tabs.Tab | undefined
  try {
    currentTab = await chrome.tabs.getCurrent()
  } catch {
    currentTab = undefined
  }
  if (currentTab?.id != null) {
    rules.push(
      modifyHeadersRule(TAB_RULE_ID, {
        tabIds: [currentTab.id],
        resourceTypes: ["sub_frame"],
      })
    )
  }

  await dnr.updateSessionRules({
    removeRuleIds: [EXTENSION_INITIATOR_RULE_ID, TAB_RULE_ID],
    addRules: rules,
  })
}
