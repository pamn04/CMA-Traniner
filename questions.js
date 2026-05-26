// The Master Question Bank Database
// Whenever you get new PDFs, ask Gemini to format them into this structure and paste them below.

const QUESTION_BANK = {
    "Domain B: Planning & Budgeting": [
        {
            q: "A major disadvantage of a static budget is that:",
            options: [
                "it is more difficult to develop than a flexible budget.",
                "it is developed at only one level of activity.",
                "variances tend to be smaller than when flexible budgeting is used.",
                "variances are more difficult to compute."
            ],
            ans: 1, // Index of the correct option (0 = A, 1 = B, 2 = C, 3 = D)
            exp: "A static budget is locked to a single output volume. When actual activity scales up, variable costs naturally increase. Comparing this to a static baseline results in an artificial 'unfavorable' variance."
        },
        {
            q: "Which forecasting methodology uses a statistical optimization technique that minimizes the sum of squared errors?",
            options: [
                "Delphi consensus method framework",
                "Linear regression analysis methodology",
                "Exponential smoothing variance adjustment",
                "Moving average baseline smoothing"
            ],
            ans: 1,
            exp: "Linear regression analysis minimizes the sum of the squared errors (Ordinary Least Squares) to find the line of best fit."
        }
    ],
    
    "Domain C: Performance Management": [
        {
            q: "An analyst encounters an isolated favorable price variance coupled with a heavily unfavorable efficiency variance. What does this reveal?",
            options: [
                "The production floor automated too rapidly.",
                "The purchasing department acquired low-grade material causing scrap.",
                "Inventory tracking metrics were updated incorrectly.",
                "Standard pricing metrics were adjusted upward."
            ],
            ans: 1,
            exp: "A favorable price variance means materials were bought cheap. If they are low quality, they create scrap, causing an unfavorable efficiency (usage) variance."
        }
    ],

    "Domain D: Cost Management": [
        {
            q: "Under standard variable costing systems, which costs are completely excluded from product inventoriable cost metrics?",
            options: [
                "Direct labor costs",
                "Fixed manufacturing overhead expenses",
                "Variable manufacturing overhead allocations",
                "Raw materials consumed directly"
            ],
            ans: 1,
            exp: "Variable costing treats fixed manufacturing overhead strictly as a period cost, expensing it entirely in the month it occurs."
        }
    ],

    "Domain F: Technology & Analytics": [
        {
            q: "An operations team needs to extract patterns without assigning explicit predetermined target labels. Which methodology should they use?",
            options: [
                "Supervised learning classification",
                "Unsupervised learning clustering models",
                "Linear programming optimization",
                "Deterministic database indexing"
            ],
            ans: 1,
            exp: "Unsupervised learning techniques, such as clustering, analyze unlabeled data vectors to uncover natural groupings without human-defined targets."
        }
    ]
};

