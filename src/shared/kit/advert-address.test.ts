import { describe, expect, it } from "vitest";
import { advertAddress } from "./advert-address.js";

describe("an advert's address (dedupe FR-2)", () => {
  it("drops the campaign tail and the fragment, keeps a real parameter", () => {
    expect(
      advertAddress("https://jobs.example.com/view/12?utm_source=x&id=7#top"),
    ).toBe("https://jobs.example.com/view/12?id=7");
  });

  it("drops every known tracking parameter", () => {
    expect(
      advertAddress(
        "https://a.example/1?gclid=1&fbclid=2&msclkid=3&clickid=4&click_id=5&campaign_id=6&source=7&ref=8&UTM_Medium=9",
      ),
    ).toBe("https://a.example/1");
  });

  it("keeps the parameter that tells Lanbide's adverts apart", () => {
    expect(
      advertAddress(
        "https://www.lanbide.euskadi.eus/oferta/?IDRG=123&utm_campaign=x",
      ),
    ).toBe("https://www.lanbide.euskadi.eus/oferta/?IDRG=123");
  });

  it("keeps a route in the fragment, which is the address itself", () => {
    expect(
      advertAddress("https://cvvp.nva.gov.lv/#/pub/vakances/462167750"),
    ).toBe("https://cvvp.nva.gov.lv/#/pub/vakances/462167750");
  });

  it("makes the trailing slash and an empty query no other address", () => {
    expect(advertAddress("https://jobs.example.com/view/12/")).toBe(
      advertAddress("https://jobs.example.com/view/12?utm_source=x"),
    );
  });

  it("trims an address that is not a URL and keeps it as written", () => {
    expect(advertAddress("  not an address ")).toBe("not an address");
  });
});
