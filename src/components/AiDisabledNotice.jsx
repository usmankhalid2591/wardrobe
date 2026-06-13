export default function AiDisabledNotice({ feature }) {
  return (
    <div className="empty">
      <h3>AI feature turned off</h3>
      <p>{feature} is disabled. Re-enable it under More &rarr; Settings &rarr; AI features.</p>
    </div>
  )
}
