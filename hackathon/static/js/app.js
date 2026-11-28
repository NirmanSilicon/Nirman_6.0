(() => {
  const root = document.documentElement;
  const themeStorageKey = root.classList.contains("home-theme") ? "mpc-home-theme-v2" : "mpc-theme";
  const storedTheme = localStorage.getItem(themeStorageKey);
  if (storedTheme === "light" || storedTheme === "dark") root.dataset.theme = storedTheme;

  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem(themeStorageKey, root.dataset.theme);
  });

  const menuButton = document.querySelector(".mobile-menu");
  const nav = document.querySelector(".main-nav");
  const closeNavigation = () => {
    nav?.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
  };
  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("nav-open") ?? false;
    menuButton.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNavigation));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });

  document.querySelectorAll(".toast").forEach((toast) => {
    window.setTimeout(() => toast.classList.add("toast-hide"), 4200);
    toast.addEventListener("click", () => toast.classList.add("toast-hide"));
  });

  const regForm = document.querySelector("[data-register-form]");
  regForm?.addEventListener("submit", (event) => {
    const password = regForm.elements.password.value;
    const confirmation = regForm.elements.confirm_password.value;
    if (password !== confirmation) {
      event.preventDefault();
      window.alert("Your passwords don't match yet.");
      regForm.elements.confirm_password.focus();
    }
  });

  const dataNode = document.getElementById("assessment-data");
  if (dataNode) {
    const categories = JSON.parse(dataNode.textContent);
    const questions = categories.flatMap((category, categoryIndex) =>
      category.questions.map((question) => ({ ...question, category, categoryIndex })),
    );
    const answers = {};
    let active = 0;
    const $ = (id) => document.getElementById(id);
    const csrf = document.querySelector(".csrf-source input[name=csrfmiddlewaretoken]").value;

    function render() {
      const current = questions[active];
      const category = current.category;
      $("category-kicker").textContent = `CATEGORY ${String(current.categoryIndex + 1).padStart(2, "0")} / ${String(categories.length).padStart(2, "0")}`;
      $("category-title").textContent = category.name;
      $("category-description").textContent = category.description;
      $("question-counter").textContent = `QUESTION ${String(active + 1).padStart(2, "0")} / ${questions.length}`;
      $("progress-label").textContent = `${Object.keys(answers).length} of ${questions.length} answered`;
      $("progress-bar").style.width = `${Math.round(Object.keys(answers).length / questions.length * 100)}%`;
      $("question-content").innerHTML = "";

      const question = document.createElement("section");
      question.className = "question-card";
      const title = document.createElement("h3");
      title.textContent = current.prompt;
      const explanation = document.createElement("p");
      explanation.className = "question-explanation";
      explanation.textContent = current.explanation;
      const options = document.createElement("div");
      options.className = "answer-options";
      current.options.forEach((option) => {
        const label = document.createElement("label");
        label.className = `answer-option${answers[current.id] === option.value ? " selected" : ""}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `question-${current.id}`;
        input.value = option.value;
        input.checked = answers[current.id] === option.value;
        input.addEventListener("change", () => {
          answers[current.id] = option.value;
          $("assessment-error").textContent = "";
          render();
        });
        const marker = document.createElement("span");
        marker.className = "radio-mark";
        const copy = document.createElement("span");
        copy.textContent = option.label;
        label.append(input, marker, copy);
        options.append(label);
      });
      question.append(title, explanation, options);
      $("question-content").append(question);
      $("category-nav").innerHTML = "";
      categories.forEach((item, index) => {
        const button = document.createElement("button");
        const start = questions.findIndex((q) => q.categoryIndex === index);
        const end = questions.findLastIndex
          ? questions.findLastIndex((q) => q.categoryIndex === index)
          : questions.map((q) => q.categoryIndex).lastIndexOf(index);
        const done = questions.slice(start, end + 1).every((q) => answers[q.id]);
        button.className = `category-step${index === current.categoryIndex ? " active" : ""}${done ? " complete" : ""}`;
        button.type = "button";
        const number = document.createElement("span");
        number.className = "step-number";
        number.textContent = done ? "✓" : `0${index + 1}`;
        const copy = document.createElement("span");
        const name = document.createElement("b");
        name.textContent = item.name;
        const status = document.createElement("small");
        status.textContent = done ? "Complete" : `${item.questions.length} questions`;
        copy.append(name, status);
        const arrow = document.createElement("i");
        arrow.textContent = "›";
        button.append(number, copy, arrow);
        button.addEventListener("click", () => {
          active = start;
          render();
        });
        $("category-nav").append(button);
      });
      $("previous-question").disabled = active === 0;
      $("next-question").hidden = active === questions.length - 1;
      $("submit-assessment").hidden = active !== questions.length - 1;
    }

    $("previous-question").addEventListener("click", () => {
      if (active > 0) { active -= 1; render(); }
    });
    $("next-question").addEventListener("click", () => {
      if (!answers[questions[active].id]) {
        $("assessment-error").textContent = "Choose an answer before continuing.";
        return;
      }
      active += 1;
      render();
    });
    $("submit-assessment").addEventListener("click", async (event) => {
      const missing = questions.findIndex((question) => !answers[question.id]);
      if (missing !== -1) {
        active = missing;
        render();
        $("assessment-error").textContent = "Please answer every question to generate a complete result.";
        return;
      }
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = "Calculating your results…";
      try {
        const response = await fetch("/assessment/submit/", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
          body: JSON.stringify(answers),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "We couldn't save your assessment.");
        window.location.assign(result.redirect);
      } catch (error) {
        $("assessment-error").textContent = error.message;
        button.disabled = false;
        button.innerHTML = "See my results <span>↗</span>";
      }
    });
    render();
  }

  document.querySelectorAll("[data-quiz-question]").forEach((question) => {
    question.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "radio") return;
      const feedback = question.querySelector("[data-quiz-feedback]");
      if (!feedback) return;
      feedback.textContent = input.dataset.feedback || "";
      feedback.hidden = false;
      feedback.classList.toggle("is-correct", input.dataset.correct === "true");
      feedback.classList.toggle("is-incorrect", input.dataset.correct !== "true");
      question.querySelectorAll(".academy-choice").forEach((choice) => {
        choice.classList.toggle("selected", choice.contains(input));
      });
    });
  });

  document.querySelectorAll("[data-recommendation-form]").forEach((form) => {
    form.addEventListener("change", async () => {
      const select = form.elements.status;
      const previousStatus = form.dataset.recommendationStatus || select.value;
      const requestBody = new URLSearchParams(new FormData(form));
      select.disabled = true;
      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: {
            "X-CSRFToken": form.querySelector("[name=csrfmiddlewaretoken]").value,
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: requestBody,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not update this action.");
        const row = form.closest(".recommendation-row");
        form.dataset.recommendationStatus = select.value;
        row.querySelector(".rec-check").classList.toggle("is-done", select.value === "completed");
        row.querySelector(".rec-check").textContent = select.value === "completed" ? "✓" : "↗";
        const progressText = document.querySelector(".progress-number");
        if (progressText) progressText.innerHTML = `${result.progress}<small>%</small>`;
        const progressBar = document.querySelector(".progress-overview .track i");
        if (progressBar) progressBar.style.width = `${result.progress}%`;
        const completedCount = document.querySelector("[data-completed-count]");
        if (completedCount) completedCount.textContent = result.completed_count;
        const pendingCount = document.querySelector("[data-pending-count]");
        if (pendingCount) pendingCount.textContent = result.pending_count;
      } catch (error) {
        select.value = previousStatus;
        window.alert(error.message);
      } finally {
        select.disabled = false;
      }
    });
  });
})();
