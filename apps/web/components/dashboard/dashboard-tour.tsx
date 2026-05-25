"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function DashboardTour() {
  useEffect(() => {
    // Check if the user has already seen the tour
    const hasSeenTour = localStorage.getItem("chai_dashboard_tour");

    if (!hasSeenTour) {
      // Small delay to let the UI render completely
      const timer = setTimeout(() => {
        const tour = driver({
          showProgress: true,
          steps: [
            {
              popover: {
                title: "Welcome to ChaiForms!",
                description: "Let's take a quick tour of your new dashboard.",
                side: "bottom",
                align: "start",
              },
            },
            {
              element: "#create-first-form-btn",
              popover: {
                title: "Create a Form",
                description: "This is where you can create your very first form.",
                side: "top",
                align: "start",
              },
            },
            {
              element: "#new-form-btn",
              popover: {
                title: "Create a Form",
                description: "You can also create a new form here.",
                side: "left",
                align: "start",
              },
            },
          ],
          onDestroyStarted: () => {
            if (!tour.hasNextStep() || confirm("Are you sure you want to skip the tour?")) {
              tour.destroy();
            }
          },
        });

        // Start the tour if any of the target elements exist
        const firstFormBtn = document.querySelector("#create-first-form-btn");
        const newFormBtn = document.querySelector("#new-form-btn");

        if (firstFormBtn || newFormBtn) {
          tour.drive();
        }

        // Mark as seen so it doesn't show up again
        localStorage.setItem("chai_dashboard_tour", "true");
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
