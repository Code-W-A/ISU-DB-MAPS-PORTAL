"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Steps, Step } from "@/components/ui/steps"

export default function GoogleMapsSetupGuide() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Google Maps API Setup Guide</h1>
      <p className="text-lg mb-8">
        Follow these steps to properly configure your Google Maps API key and remove the "For development purposes only"
        watermark.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Required Steps</CardTitle>
          <CardDescription>Complete these steps in the Google Cloud Console</CardDescription>
        </CardHeader>
        <CardContent>
          <Steps>
            <Step title="Enable Billing">
              <p className="mb-4">
                The "For development purposes only" watermark appears when you're using a Google Maps API key without
                billing enabled.
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Go to the{" "}
                  <a
                    href="https://console.cloud.google.com/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console Billing page
                  </a>
                </li>
                <li>Select your project</li>
                <li>Link a billing account to your project</li>
                <li>Even with the free tier ($200 monthly credit), this will remove the watermark</li>
              </ol>
            </Step>

            <Step title="Set API Restrictions">
              <p className="mb-4">Properly restrict your API key to enhance security and meet Google's requirements:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Go to the{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console Credentials page
                  </a>
                </li>
                <li>Find and edit your Maps API key</li>
                <li>Under "Application restrictions", select "HTTP referrers (websites)"</li>
                <li>
                  Add your website domains (e.g., <code>*.yourdomain.com/*</code>, <code>localhost:*</code> for
                  development)
                </li>
                <li>Under "API restrictions", select "Restrict key" and choose only the Maps APIs you need</li>
              </ol>
            </Step>

            <Step title="Enable Required APIs">
              <p className="mb-4">Make sure all required Maps APIs are enabled for your project:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Go to the{" "}
                  <a
                    href="https://console.cloud.google.com/apis/library"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console API Library
                  </a>
                </li>
                <li>
                  Search for and enable these APIs:
                  <ul className="list-disc pl-5 mt-2">
                    <li>Maps JavaScript API</li>
                    <li>Places API (if you're using location search)</li>
                    <li>Geocoding API (if you're using geocoding)</li>
                  </ul>
                </li>
              </ol>
            </Step>

            <Step title="Wait for Changes to Propagate">
              <p className="mb-4">After making these changes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Changes may take up to 5 minutes to propagate</li>
                <li>Clear your browser cache</li>
                <li>Restart your application</li>
              </ul>
            </Step>
          </Steps>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update Your API Key in the Application</CardTitle>
          <CardDescription>Make sure you're using the properly configured API key</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Once your API key is properly configured in Google Cloud Console, make sure it's correctly set in your
            environment variables:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Check that the <code>GOOGLE_MAPS_API_KEY</code> environment variable in Vercel contains your properly
              configured API key
            </li>
            <li>Verify that your application is using this environment variable correctly</li>
            <li>
              If you're using a client-side key (<code>GOOGLE_MAPS_API_KEY</code>), make sure it has appropriate HTTP
              referrer restrictions
            </li>
          </ol>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <p className="text-yellow-700">
              <strong>Important:</strong> For production use, it's recommended to use the server-side API key approach
              where your backend provides the key through an API route with proper rate limiting and origin checking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
