import { describe, expect, it } from "vitest";
import { gateGolden } from "../../../test/gate/golden.js";
import { hygieneReason } from "./hygiene.js";

const NOT_ADVERT =
  "title is a listing page, a job-ad template, a product or a site task, not an advert";
const ROLE =
  "title names a sales, recruiting, trainee, labourer, retail, operative or gig role";

describe("hygiene (gate FR-7)", () => {
  it("leaves out a listing page, a template, workwear, a search page and a filled vacancy", () => {
    expect(
      [
        "Jobs als Bauzeichner: 3.504 Stellenangebote",
        "Cloud Architect*in Stellenanzeigen Vorlage",
        "Job Zunfthose IKARUS",
        "Design Engineer jobs near Trafford",
        "Elektriker (m/w/d) - STELLE BESETZT",
      ].map((title) => hygieneReason({ title })),
    ).toEqual([NOT_ADVERT, NOT_ADVERT, NOT_ADVERT, NOT_ADVERT, NOT_ADVERT]);
  });

  it("leaves out an application form only when its address is a form's too", () => {
    const title = "Teamleiter Elektrotechnik (m/w/d) - Bewerbung";
    expect([
      hygieneReason({
        title,
        url: "https://x.umantis.com/Application/CheckLogin/1",
      }),
      hygieneReason({ title, url: "https://x.example/jobs/1" }),
    ]).toEqual(["an advert's application form, not the advert", null]);
  });

  it("leaves out sales, trainee, apprentice, student, helper and operative roles", () => {
    expect(
      [
        "Elektrohelfer (m/w/d)",
        "Stage ingénieur méthodes",
        "Sales Engineer",
        "Ausbildung zum Elektroniker",
        "Werkstudent Software",
        "Ayudante de electricista",
        "Forklift driver",
      ].map((title) => hygieneReason({ title })),
    ).toEqual([ROLE, ROLE, ROLE, ROLE, ROLE, ROLE, ROLE]);
  });

  it("lets an engineer through", () => {
    expect(
      ["Mechanical Engineer", "Ingeniero de procesos"].map((title) =>
        hygieneReason({ title }),
      ),
    ).toEqual([null, null]);
  });

  it("gives every title of the legacy's golden set the same reason", async () => {
    const { cases } = await gateGolden();
    const differ = cases.filter(
      ({ t, hygiene }) => hygieneReason({ title: t }) !== hygiene,
    );
    expect(differ.map(({ t }) => t)).toEqual([]);
  });
});
