-- Career-mode extras (awards, player conversations) stored as JSON on the career row.
ALTER TABLE "Career" ADD COLUMN "careerJson" TEXT NOT NULL DEFAULT '{}';
