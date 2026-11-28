import { test, expect } from "@playwright/test";

test("evaluation shows provenance and computes one versus zero", async ({ page }) => {
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/evaluation");
  const studio=page.frameLocator("iframe");
  await expect(studio.locator("#selected-source")).toContainText("SYNTHETIC FIXTURE");
  await studio.getByRole("button",{name:"Compare Off vs Enforce"}).click();
  await expect(studio.locator(".off .count b")).toHaveText("1");
  await expect(studio.locator(".enforce .count b")).toHaveText("0");
  await expect(studio.locator(".enforce .timeline")).toContainText("TOOL_OUTSIDE_CONTRACT");
  await studio.getByRole("button",{name:"Benign invoice",exact:true}).click();
  await studio.getByRole("button",{name:"Compare Off vs Enforce"}).click();
  await expect(studio.locator(".off .count b")).toHaveText("0");
  await expect(studio.locator(".enforce .result-summary")).toContainText("40.00");
  await studio.locator(".architecture-map > summary").click();
  await expect(studio.locator(".layer-grid .layer-card")).toHaveCount(6);
  expect(errors).toEqual([]);
  await page.screenshot({path:"../reports/ui/evaluation-sample.png",fullPage:true});
});

test("PDF upload through frontend supports review, execution and all negative agent cases", async ({ page,request }) => {
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  const sample=await request.get("/api/evaluation/samples/invoice-001/pdf");expect(sample.ok()).toBeTruthy();
  await page.goto("/evaluation");const studio=page.frameLocator("iframe");
  await studio.getByRole("button",{name:"Upload your document",exact:true}).click();
  await studio.getByLabel("Upload an invoice document").setInputFiles({name:"browser-invoice.pdf",mimeType:"application/pdf",buffer:await sample.body()});
  await studio.getByRole("button",{name:"Upload & inspect source"}).click();
  await expect(studio.locator("#invoice-editor")).toHaveValue(/Sensor modules/);
  await expect(studio.locator("#original-note")).toContainText("browser-invoice.pdf");
  await expect(studio.locator("#field-evidence")).toContainText("line_items");
  await studio.getByRole("button",{name:"Check fields & totals"}).click();
  await expect(studio.locator("#review-status")).toContainText("PASS");
  await studio.getByRole("button",{name:"Confirm reviewed invoice"}).click();
  await expect(studio.locator("#confirmation-proof")).toBeVisible();
  await expect(studio.locator("#selected-source")).toContainText("browser-invoice.pdf");
  await studio.getByRole("button",{name:"Compare Off vs Enforce"}).click();
  await expect(studio.locator(".enforce .count b")).toHaveText("0");
  await expect(studio.locator("#upload-agent-case option")).toHaveCount(8);
  for(const value of ["none","transfer","other_record","invalid_arguments","unknown_tool","tampered_total","stopped","guard_unavailable"]){
    await studio.locator("#upload-agent-case").selectOption(value);
    await studio.getByRole("button",{name:"Run guarded agent",exact:false}).click();
    await expect(studio.locator("#upload-agent-status")).toContainText("Case PASS");
    await expect(studio.getByRole("button",{name:"Run guarded agent",exact:false})).toBeEnabled();
  }
  await expect(studio.locator("#upload-agent-result")).toContainText("No answer was released");
  expect(errors).toEqual([]);
  await page.screenshot({path:"../reports/ui/upload-workflow.png",fullPage:true});
});

test("invalid-total PDF cannot become an authorized task",async({page,request})=>{
  const sample=await request.get("/api/evaluation/negative-samples/invalid-total");
  await page.goto("/evaluation");const studio=page.frameLocator("iframe");
  await studio.getByRole("button",{name:"Upload your document",exact:true}).click();
  await studio.getByLabel("Upload an invoice document").setInputFiles({name:"bad-total.pdf",mimeType:"application/pdf",buffer:await sample.body()});
  await studio.getByRole("button",{name:"Upload & inspect source"}).click();
  await expect(studio.locator("#review-status")).toContainText("OUTPUT_TOTAL_MISMATCH");
  await studio.getByRole("button",{name:"Confirm reviewed invoice"}).click();
  await expect(studio.locator("#upload-status")).toContainText("correct the arithmetic");
  await expect(studio.locator("#upload-agent-panel")).toBeHidden();
});

test("draft board moves on approval, stays on rejection, and preserves effects after stop",async({page})=>{
  await page.goto("/lab");
  await page.getByRole("tab",{name:"Draft routing & approvals"}).click();
  await page.getByRole("button",{name:"Start draft routing demo",exact:false}).first().click();
  await expect(page.locator(".off .queue-column").nth(1)).toContainText("draft-001");
  await expect(page.locator(".monitor .queue-column").nth(1)).toContainText("draft-001");
  await expect(page.locator(".enforce .queue-column").first()).toContainText("draft-001");
  await expect(page.locator(".pending-review-banner")).toBeVisible();
  await page.getByLabel("Operator token from .env").fill(process.env.AGENT_X_OPERATOR_TOKEN||"local-operator-change-me");
  await page.getByRole("button",{name:"Approve exact move",exact:true}).click();
  await expect(page.locator(".enforce .queue-column").nth(1)).toContainText("draft-001");
  await expect(page.locator(".enforce .execution-heading")).toHaveText("Completed");
  await page.getByRole("button",{name:"Recheck / resume authorization"}).click();
  await expect(page.locator(".enforce .effect-summary")).toContainText("1 actual queue move");
  await page.getByRole("button",{name:"Stop Enforce run",exact:true}).click();
  await expect(page.getByRole("button",{name:"Enforce is stopped"})).toBeDisabled();
  await expect(page.locator(".enforce .queue-column").nth(1)).toContainText("draft-001");
  await page.getByRole("button",{name:"Start draft routing demo",exact:false}).first().click();
  await page.getByRole("button",{name:"Reject move",exact:true}).click();
  await expect(page.locator(".enforce .execution-heading")).toHaveText("Rejected by reviewer");
  await expect(page.locator(".enforce .queue-column").first()).toContainText("draft-001");
  await expect(page.locator(".enforce .effect-summary")).toContainText("0 actual queue moves");
  await page.screenshot({path:"../reports/ui/draft-routing.png",fullPage:true});
});

test("inbox is independent of draft queues and agent tab executes a task",async({page})=>{
  await page.goto("/lab");await page.getByRole("button",{name:"Run comparison",exact:false}).first().click();
  await expect(page.locator(".off .inbox-delivery")).toHaveCount(1);
  await expect(page.locator(".monitor .inbox-delivery")).toHaveCount(1);
  await expect(page.locator(".enforce .inbox-delivery")).toHaveCount(0);
  const monitoredTransfer=page.locator(".monitor .lab-events > div").filter({hasText:"send_mock_attachment"});
  await expect(monitoredTransfer).toContainText("WOULD BLOCK");
  await expect(monitoredTransfer.locator(".execution-fact")).toHaveText("EXECUTED");
  const enforcedTransfer=page.locator(".enforce .lab-events > div").filter({hasText:"send_mock_attachment"});
  await expect(enforcedTransfer.locator(".execution-fact")).toHaveText("EXECUTION BLOCKED");
  await expect(page.locator(".queue-board")).toHaveCount(0);
  await page.getByRole("tab",{name:"Agent runtime",exact:true}).click();
  await page.getByLabel("Runtime",{exact:true}).selectOption("local");
  await page.getByRole("button",{name:"Run guarded agent",exact:false}).click();
  await expect(page.locator(".agent-result h2")).toContainText("Task completed");
  await expect(page.locator(".agent-result .answer-card")).toContainText("pass");
});

test("mobile evaluation and lab do not overflow horizontally",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/api/evaluation/view");await expect(page.locator("#workflow-card")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
  await page.screenshot({path:"../reports/ui/mobile-evaluation.png",fullPage:true});
  await page.goto("/lab");await expect(page.getByRole("tab",{name:"Scenario comparison"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});
