import { describe, expect, it } from "vitest";
import { isPushEndpoint } from "../src/notify/push.js";

describe("push endpoints", () => {
  it("accepts the browsers' push services", () => {
    for (const url of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
      "https://web.push.apple.com/abc",
      "https://api.push.apple.com/3/device/abc",
    ]) {
      expect(isPushEndpoint(url), url).toBe(true);
    }
  });

  it("refuses anything the server should not call", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost:3000/api/admin/season-end",
      "https://fcm.googleapis.com.evil.example/x",
      "https://evilpush.apple.com.example/x",
      "https://user:pass@fcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "not a url",
    ]) {
      expect(isPushEndpoint(url), url).toBe(false);
    }
  });
});
