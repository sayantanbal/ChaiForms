/**
 * ChaiForms Seed Script
 * Idempotent: safe to run multiple times (upserts by email/slug).
 *
 * Run via: pnpm db:seed
 */
import "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const db = drizzle(DATABASE_URL);

// We import from compiled paths to avoid the @repo/schemas resolution issue
import {
  usersTable,
  formsTable,
  responsesTable,
  answersTable,
  templatesTable,
  pagesTable,
  workspacesTable,
  workspaceMembersTable,
} from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomDate(daysAgo: number, daysAgoEnd = 0): Date {
  const now = Date.now();
  const start = now - daysAgo * 24 * 60 * 60 * 1000;
  const end = now - daysAgoEnd * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (end - start));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------
const animeFormFields = [
  {
    id: "f1a00000-0000-0000-0000-000000000001",
    type: "single_select" as const,
    label: "What's your anime genre preference?",
    required: true,
    options: ["Shonen", "Shojo", "Isekai", "Mecha", "Slice of Life", "Horror"],
    placeholder: "Pick your favourite",
    description: "This will help us match your character!",

  },
  {
    id: "f1a00000-0000-0000-0000-000000000002",
    type: "single_select" as const,
    label: "Choose your fighting style",
    required: true,
    options: ["Brute Force", "Strategy", "Speed", "Magic", "Teamwork"],
    description: "How do you prefer to solve problems?",
    conditionalRules: {
      combinator: "AND" as const,
      rules: [
        {
          field: "f1a00000-0000-0000-0000-000000000001",
          operator: "equals" as const,
          value: "Shonen",
        },
      ],
    },
  },
  {
    id: "f1a00000-0000-0000-0000-000000000003",
    type: "rating" as const,
    label: "How important is friendship in anime?",
    required: false,
    maxRating: 10,
    description: "1 = Solo hero, 10 = Friends are everything",

  },
  {
    id: "f1a00000-0000-0000-0000-000000000004",
    type: "multi_select" as const,
    label: "Which anime have you watched?",
    required: false,
    options: ["Naruto", "One Piece", "Attack on Titan", "Demon Slayer", "Jujutsu Kaisen", "Dragon Ball Z"],

  },
  {
    id: "f1a00000-0000-0000-0000-000000000005",
    type: "short_text" as const,
    label: "What would your anime character's special move be called?",
    required: false,
    placeholder: "e.g. Shadow Fist of Destiny",
    maxLength: 100,

  },
  {
    id: "f1a00000-0000-0000-0000-000000000006",
    type: "email" as const,
    label: "Your email (for character reveal)",
    required: false,
    placeholder: "hero@example.com",
    description: "We'll send your anime character result here!",

  },
];

const osFormFields = [
  {
    id: "f2b00000-0000-0000-0000-000000000001",
    type: "single_select" as const,
    label: "Which OS do you use daily?",
    required: true,
    options: ["Linux", "macOS", "Windows", "FreeBSD", "ChromeOS"],
    placeholder: "Your daily driver",

  },
  {
    id: "f2b00000-0000-0000-0000-000000000002",
    type: "single_select" as const,
    label: "Which Linux distro do you prefer?",
    required: false,
    options: ["Ubuntu", "Arch Linux", "Fedora", "Debian", "NixOS", "Gentoo"],
    description: "Only if you selected Linux above!",
    conditionalRules: {
      combinator: "AND" as const,
      rules: [
        {
          field: "f2b00000-0000-0000-0000-000000000001",
          operator: "equals" as const,
          value: "Linux",
        },
      ],
    },
  },
  {
    id: "f2b00000-0000-0000-0000-000000000003",
    type: "rating" as const,
    label: "Rate your OS out of 10",
    required: true,
    maxRating: 10,

  },
  {
    id: "f2b00000-0000-0000-0000-000000000004",
    type: "multi_select" as const,
    label: "What do you use your OS for?",
    required: true,
    options: ["Development", "Gaming", "Design", "Office Work", "Server", "School"],

  },
  {
    id: "f2b00000-0000-0000-0000-000000000005",
    type: "long_text" as const,
    label: "What feature would you add to your OS?",
    required: false,
    placeholder: "Describe your dream feature...",
    maxLength: 500,

  },
  {
    id: "f2b00000-0000-0000-0000-000000000006",
    type: "checkbox" as const,
    label: "I use dark mode exclusively",
    required: false,

  },
];

const startupFormFields = [
  {
    id: "f3c00000-0000-0000-0000-000000000001",
    type: "short_text" as const,
    label: "Startup idea in one sentence",
    required: true,
    placeholder: "e.g. Uber for dog walking",
    maxLength: 200,

  },
  {
    id: "f3c00000-0000-0000-0000-000000000002",
    type: "single_select" as const,
    label: "Target market",
    required: true,
    options: ["B2B", "B2C", "B2B2C", "Government", "Non-profit"],

  },
  {
    id: "f3c00000-0000-0000-0000-000000000003",
    type: "number" as const,
    label: "Estimated TAM (in $ millions)",
    required: false,
    min: 1,
    max: 100000,
    placeholder: "e.g. 500",

  },
  {
    id: "f3c00000-0000-0000-0000-000000000004",
    type: "rating" as const,
    label: "How confident are you in this idea?",
    required: true,
    maxRating: 10,
    description: "1 = Just brainstorming, 10 = Ready to quit my job",

  },
  {
    id: "f3c00000-0000-0000-0000-000000000005",
    type: "multi_select" as const,
    label: "What challenges do you foresee?",
    required: false,
    options: ["Funding", "Team", "Technical", "Market Timing", "Competition", "Regulation"],

  },
  {
    id: "f3c00000-0000-0000-0000-000000000006",
    type: "email" as const,
    label: "Your email for feedback",
    required: false,
    placeholder: "founder@startup.com",

  },
];

const movieFormFields = [
  {
    id: "f4d00000-0000-0000-0000-000000000001",
    type: "short_text" as const,
    label: "Actor Name",
    required: true,
  },
  {
    id: "f4d00000-0000-0000-0000-000000000002",
    type: "single_select" as const,
    label: "Role Applying For",
    required: true,
    options: ["Lead", "Supporting", "Extra", "Stunt Double"],
  },
];

const gameFormFields = [
  {
    id: "f5e00000-0000-0000-0000-000000000001",
    type: "short_text" as const,
    label: "Player Tag",
    required: true,
  },
  {
    id: "f5e00000-0000-0000-0000-000000000002",
    type: "multi_select" as const,
    label: "Preferred Genres",
    required: true,
    options: ["RPG", "FPS", "Strategy", "Puzzle"],
  },
];

const eventFormFields = [
  {
    id: "f6f00000-0000-0000-0000-000000000001",
    type: "short_text" as const,
    label: "Your Name",
    required: true,
  },
  {
    id: "f6f00000-0000-0000-0000-000000000002",
    type: "email" as const,
    label: "Email Address",
    required: true,
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log("🌱 Starting ChaiForms seed...");

  // ---- 1. Demo users -------------------------------------------------------
  console.log("Creating demo users...");

  let demoUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "demo@chaiforms.dev"))
    .limit(1)
    .then((r) => r[0]);

  if (!demoUser) {
    const [created] = await db
      .insert(usersTable)
      .values({
        email: "demo@chaiforms.dev",
        fullName: "ChaiForms Demo",
        role: "creator",
        emailVerified: true,
      })
      .returning();
    demoUser = created!;
    console.log("  ✓ Created demo creator:", demoUser.id);
  } else {
    console.log("  ✓ Demo creator exists:", demoUser.id);
  }

  let adminUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "admin@chaiforms.dev"))
    .limit(1)
    .then((r) => r[0]);

  if (!adminUser) {
    const [created] = await db
      .insert(usersTable)
      .values({
        email: "admin@chaiforms.dev",
        fullName: "ChaiForms Admin",
        role: "admin",
        emailVerified: true,
      })
      .returning();
    adminUser = created!;
    console.log("  ✓ Created admin:", adminUser.id);
  } else {
    console.log("  ✓ Admin user exists:", adminUser.id);
  }

  // ---- 1b. Demo workspace --------------------------------------------------
  console.log("Creating demo workspace...");

  let demoWorkspace = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.name, "Demo Workspace"))
    .limit(1)
    .then((r) => r[0]);

  if (!demoWorkspace) {
    const [created] = await db
      .insert(workspacesTable)
      .values({
        name: "Demo Workspace",
        description: "Shared workspace for demo collaboration and judge testing.",
        ownerId: demoUser.id,
      })
      .returning();
    demoWorkspace = created!;
    console.log("  ✓ Created demo workspace:", demoWorkspace.id);
  } else {
    console.log("  ✓ Demo workspace exists:", demoWorkspace.id);
  }

  const ensureMember = async (
    userId: string,
    role: "admin" | "creator" | "viewer",
  ) => {
    const existing = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, demoWorkspace!.id),
          eq(workspaceMembersTable.userId, userId),
        ),
      )
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      await db.insert(workspaceMembersTable).values({
        workspaceId: demoWorkspace!.id,
        userId,
        role,
        acceptedAt: new Date(),
      });
    }
  };

  await ensureMember(demoUser.id, "admin");
  await ensureMember(adminUser.id, "creator");

  // ---- 2. Templates --------------------------------------------------------
  console.log("Creating templates...");

  const templateDefs = [
    {
      title: "Which Anime Character Are You?",
      description: "Discover your anime alter ego based on your personality and preferences.",
      theme: "anime" as const,
      fields: animeFormFields,
    },
    {
      title: "Rate Your Favorite OS",
      description: "Share your operating system preferences and help us understand the developer community.",
      theme: "os" as const,
      fields: osFormFields,
    },
    {
      title: "Startup Idea Validator",
      description: "Pitch your startup idea and get community feedback to validate your concept.",
      theme: "startup" as const,
      fields: startupFormFields,
    },
    {
      title: "Movie Casting Call Audition",
      description: "Apply for roles in our upcoming indie feature film.",
      theme: "movie" as const,
      fields: movieFormFields,
    },
    {
      title: "Game Beta Tester Application",
      description: "Sign up to playtest our retro arcade game before launch.",
      theme: "game" as const,
      fields: gameFormFields,
    },
    {
      title: "Community Meetup RSVP",
      description: "Join us for our monthly indie creator gathering.",
      theme: "event" as const,
      fields: eventFormFields,
    },
  ];

  const templates: typeof templatesTable.$inferSelect[] = [];
  for (const tDef of templateDefs) {
    const existing = await db
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.title, tDef.title))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      const [t] = await db
        .insert(templatesTable)
        .values({
          title: tDef.title,
          description: tDef.description,
          theme: tDef.theme,
          fields: tDef.fields as any,
        })
        .returning();
      templates.push(t!);
      console.log(`  ✓ Created template: ${tDef.title}`);
    } else {
      templates.push(existing);
      console.log(`  ✓ Template exists: ${tDef.title}`);
    }
  }

  // ---- 3. Published forms --------------------------------------------------
  console.log("Creating published forms...");

  const DEMO_PASSWORD_HASH = await bcrypt.hash("demo1234", 10);

  const formDefs = [
    {
      slug: "which-anime-character-are-you",
      title: "Which Anime Character Are You?",
      description: "Answer these questions and find your anime spirit character!",
      theme: "anime" as const,
      visibility: "public" as const,
      fields: animeFormFields,
      sendRespondentConfirmation: true,
      accessPasswordHash: null,
      pages: [
        {
          id: "e1000000-0000-0000-0000-000000000001",
          title: "Your Preferences",
          order: 0,
          fieldIds: [
            "f1a00000-0000-0000-0000-000000000001",
            "f1a00000-0000-0000-0000-000000000002",
            "f1a00000-0000-0000-0000-000000000003",
          ],
        },
        {
          id: "e1000000-0000-0000-0000-000000000002",
          title: "Your Anime History",
          order: 1,
          fieldIds: [
            "f1a00000-0000-0000-0000-000000000004",
            "f1a00000-0000-0000-0000-000000000005",
            "f1a00000-0000-0000-0000-000000000006",
          ],
        },
      ],
    },
    {
      slug: "rate-your-favorite-os",
      title: "Rate Your Favorite OS",
      description: "Tell us about your operating system journey!",
      theme: "os" as const,
      visibility: "public" as const,
      fields: osFormFields,
      sendRespondentConfirmation: false,
      accessPasswordHash: null,
      pages: null,
    },
    {
      slug: "startup-idea-validator",
      title: "Startup Idea Validator",
      description: "Validate your startup idea with community wisdom. Password: demo1234",
      theme: "startup" as const,
      visibility: "unlisted" as const,
      fields: startupFormFields,
      sendRespondentConfirmation: false,
      accessPasswordHash: DEMO_PASSWORD_HASH,
      pages: null,
    },
  ];

  const seededForms: typeof formsTable.$inferSelect[] = [];

  for (const fDef of formDefs) {
    let form = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.slug, fDef.slug))
      .limit(1)
      .then((r) => r[0]);

    if (!form) {
      const [created] = await db
        .insert(formsTable)
        .values({
          creatorId: demoUser.id,
          title: fDef.title,
          description: fDef.description,
          slug: fDef.slug,
          status: "published",
          visibility: fDef.visibility,
          theme: fDef.theme,
          fields: fDef.fields as any,
          sendRespondentConfirmation: fDef.sendRespondentConfirmation,
          accessPasswordHash: fDef.accessPasswordHash,
          thankyouMessage: "Thank you for your response! 🎉",
        })
        .returning();
      form = created!;
      console.log(`  ✓ Created form: ${fDef.title}`);
    } else {
      console.log(`  ✓ Form exists: ${fDef.title}`);
    }

    seededForms.push(form);

    // Create pages if defined
    if (fDef.pages) {
      const existingPages = await db
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.formId, form.id));

      if (existingPages.length === 0) {
        await db.insert(pagesTable).values(
          fDef.pages.map((p) => ({
            id: p.id,
            formId: form!.id,
            title: p.title,
            order: p.order,
            fieldIds: p.fieldIds,
          })),
        );
        console.log(`    ✓ Created ${fDef.pages.length} pages for ${fDef.title}`);
      }
    }
  }

  // Workspace-scoped form (requires auth for judges)
  const workspaceFormSlug = "demo-workspace-judge-form";
  let workspaceForm = await db
    .select()
    .from(formsTable)
    .where(eq(formsTable.slug, workspaceFormSlug))
    .limit(1)
    .then((r) => r[0]);

  if (!workspaceForm) {
    const [created] = await db
      .insert(formsTable)
      .values({
        creatorId: demoUser.id,
        workspaceId: demoWorkspace.id,
        scope: "workspace",
        requiresAuth: true,
        title: "Demo Workspace Judge Form",
        description: "Workspace-only form; sign in as a workspace member to submit.",
        slug: workspaceFormSlug,
        status: "published",
        visibility: "unlisted",
        theme: "startup",
        fields: startupFormFields as any,
        sendRespondentConfirmation: false,
      })
      .returning();
    workspaceForm = created!;
    seededForms.push(workspaceForm);
    console.log("  ✓ Created workspace-scoped form:", workspaceForm.title);
  } else {
    seededForms.push(workspaceForm);
    console.log("  ✓ Workspace form exists:", workspaceForm.title);
  }

  // ---- 4. Seed responses ---------------------------------------------------
  console.log("Seeding responses (20+ per form)...");

  const animeGenres = ["Shonen", "Shojo", "Isekai", "Mecha", "Slice of Life"];
  const fightingStyles = ["Brute Force", "Strategy", "Speed", "Magic", "Teamwork"];
  const animeShows = [["Naruto", "Demon Slayer"], ["One Piece", "Jujutsu Kaisen"], ["Attack on Titan"], ["Dragon Ball Z", "Naruto", "One Piece"]];
  const specialMoves = ["Shadow Fist", "Dragon Burst", "Wind Slash", "Thunder Wave", "Void Step"];

  const osDailies = ["Linux", "macOS", "Windows", "Linux", "macOS"];
  const linuxDistros = ["Ubuntu", "Arch Linux", "Fedora", "Debian", "NixOS"];
  const osUses = [["Development", "Gaming"], ["Office Work"], ["Development", "Server"], ["Design", "School"]];

  const startupIdeas = [
    "AI-powered personal finance coach",
    "Blockchain-based supply chain tracker",
    "AR navigation for indoor spaces",
    "SaaS for freelancer invoicing",
    "Marketplace for local farm produce",
  ];
  const markets = ["B2B", "B2C", "B2B2C"];
  const challenges = [["Funding", "Team"], ["Technical", "Competition"], ["Regulation"], ["Market Timing", "Funding"]];

  for (let fi = 0; fi < seededForms.length; fi++) {
    const form = seededForms[fi]!;

    // Check existing response count
    const existingCount = await db
      .select({ id: responsesTable.id })
      .from(responsesTable)
      .where(eq(responsesTable.formId, form.id))
      .then((r) => r.length);

    if (existingCount >= 20) {
      console.log(`  ✓ Form "${form.title}" already has ${existingCount} responses`);
      continue;
    }

    const needed = 25 - existingCount;
    console.log(`  Adding ${needed} responses to "${form.title}"...`);

    for (let i = 0; i < needed; i++) {
      const startedAt = randomDate(30, 1);
      const durationSecs = Math.floor(Math.random() * 300) + 60;
      const submittedAt = new Date(startedAt.getTime() + durationSecs * 1000);

      const [response] = await db
        .insert(responsesTable)
        .values({
          formId: form.id,
          startedAt,
          submittedAt,
          respondentEmail: fi === 0 ? `user${i}@example.com` : null, // anime form has email
        })
        .returning();

      if (!response) continue;

      let answers: { responseId: string; fieldId: string; value: string }[] = [];

      if (fi === 0) {
        // Anime form
        const genre = randomElement(animeGenres);
        answers = [
          { responseId: response.id, fieldId: "f1a00000-0000-0000-0000-000000000001", value: genre },
          ...(genre === "Shonen" ? [{ responseId: response.id, fieldId: "f1a00000-0000-0000-0000-000000000002", value: randomElement(fightingStyles) }] : []),
          { responseId: response.id, fieldId: "f1a00000-0000-0000-0000-000000000003", value: String(Math.floor(Math.random() * 7) + 3) },
          { responseId: response.id, fieldId: "f1a00000-0000-0000-0000-000000000004", value: JSON.stringify(randomElement(animeShows)) },
          { responseId: response.id, fieldId: "f1a00000-0000-0000-0000-000000000005", value: randomElement(specialMoves) },
          { responseId: response.id, fieldId: "f1a00000-0000-0000-0000-000000000006", value: `user${i}@example.com` },
        ];
      } else if (fi === 1) {
        // OS form
        const os = randomElement(osDailies);
        answers = [
          { responseId: response.id, fieldId: "f2b00000-0000-0000-0000-000000000001", value: os },
          ...(os === "Linux" ? [{ responseId: response.id, fieldId: "f2b00000-0000-0000-0000-000000000002", value: randomElement(linuxDistros) }] : []),
          { responseId: response.id, fieldId: "f2b00000-0000-0000-0000-000000000003", value: String(Math.floor(Math.random() * 4) + 6) },
          { responseId: response.id, fieldId: "f2b00000-0000-0000-0000-000000000004", value: JSON.stringify(randomElement(osUses)) },
          { responseId: response.id, fieldId: "f2b00000-0000-0000-0000-000000000006", value: "true" },
        ];
      } else {
        // Startup form
        answers = [
          { responseId: response.id, fieldId: "f3c00000-0000-0000-0000-000000000001", value: randomElement(startupIdeas) },
          { responseId: response.id, fieldId: "f3c00000-0000-0000-0000-000000000002", value: randomElement(markets) },
          { responseId: response.id, fieldId: "f3c00000-0000-0000-0000-000000000003", value: String(Math.floor(Math.random() * 900) + 100) },
          { responseId: response.id, fieldId: "f3c00000-0000-0000-0000-000000000004", value: String(Math.floor(Math.random() * 5) + 5) },
          { responseId: response.id, fieldId: "f3c00000-0000-0000-0000-000000000005", value: JSON.stringify(randomElement(challenges)) },
        ];
      }

      if (answers.length > 0) {
        await db.insert(answersTable).values(answers);
      }
    }

    console.log(`  ✓ Done seeding responses for "${form.title}"`);
  }

  console.log("\n✅ ChaiForms seed complete!");
  console.log("\nDemo credentials:");
  console.log("  Creator: demo@chaiforms.dev  (use demoLogin bypass)");
  console.log("  Admin:   admin@chaiforms.dev (use demoLogin bypass)");
  console.log("  Password-protected form slug: startup-idea-validator");
  console.log("  Form password: demo1234");
  console.log("  Workspace form slug: demo-workspace-judge-form (requires auth + membership)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
