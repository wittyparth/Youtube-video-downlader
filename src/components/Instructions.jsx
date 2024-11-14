import React from 'react'

export default function Instructions() {
  return (
    <div className="mt-8 bg-[#282828] p-6 rounded-lg">
      <h2 className="text-lg font-medium mb-4">How to use:</h2>
      <ol className="list-decimal list-inside space-y-2 text-gray-300">
        <li>Copy the YouTube video URL you want to download</li>
        <li>Paste the URL in the input field above</li>
        <li>Click the Download button</li>
        <li>Choose your preferred video quality and format</li>
        <li>Wait for the download to complete</li>
      </ol>
    </div>
  )
}