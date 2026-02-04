// ==UserScript==
// @name         Google Docs Labels
// @namespace    ThorsAnvil
// @version      1.0
// @description  Adds a Labels section to Google Docs left sidebar
// @author       You
// @match        https://docs.google.com/document/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Wait for the page to fully load and the sidebar to be available
    function waitForElement(selector, callback, maxAttempts = 50) {
        let attempts = 0;
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                callback(element);
            } else if (++attempts >= maxAttempts) {
                clearInterval(interval);
                console.log('Google Docs Labels: Could not find sidebar element');
            }
        }, 200);
    }

    function createLabelsSection(documentTabsSection) {
        // Get the parent container of Document tabs
        const parentContainer = documentTabsSection.parentElement;
        if (!parentContainer) {
            console.log('Google Docs Labels: Could not find parent container');
            return;
        }

        // Check if Labels section already exists
        if (document.querySelector('#gd-labels-section')) {
            return;
        }

        // Clone the Document tabs section to get the same structure and styling
        const labelsSection = documentTabsSection.cloneNode(true);
        labelsSection.id = 'gd-labels-section';

        // Find and update the header text
        const headerElements = labelsSection.querySelectorAll('span, div');
        headerElements.forEach(el => {
            if (el.textContent.trim() === 'Document tabs') {
                el.textContent = 'Labels';
            }
        });

        // Clear the content area (keep the header structure)
        // Look for the expandable content area
        const contentContainers = labelsSection.querySelectorAll('[role="tree"], [role="group"], [data-nav-type]');
        contentContainers.forEach(container => {
            container.innerHTML = '';
        });

        // Create a placeholder for labels content
        const labelsContent = document.createElement('div');
        labelsContent.className = 'gd-labels-content';
        labelsContent.style.cssText = 'padding: 8px 16px; color: #5f6368; font-size: 12px;';
        labelsContent.textContent = 'No labels';

        // Find where to insert the labels content
        const existingContent = labelsSection.querySelector('[role="tree"], [role="group"]');
        if (existingContent) {
            existingContent.appendChild(labelsContent);
        } else {
            // Fallback: append to the section itself
            labelsSection.appendChild(labelsContent);
        }

        // Insert the Labels section before the Document tabs section
        parentContainer.insertBefore(labelsSection, documentTabsSection);

        console.log('Google Docs Labels: Labels section added successfully');
    }

    function init() {
        // Look for the Document tabs section
        // Google Docs uses various selectors, we'll try multiple approaches
        
        // Method 1: Look for text content "Document tabs"
        waitForElement('[data-tooltip="Document tabs"], [aria-label*="Document tabs"]', (element) => {
            // Find the actual section container
            let section = element;
            while (section && !section.matches('[role="navigation"], [data-nav-type], .navigation-widget-renderer-sections')) {
                section = section.parentElement;
            }
            if (section) {
                createLabelsSection(section);
            } else {
                // Fallback: use the element's closest meaningful parent
                createLabelsSection(element.closest('[class*="navigation"], [class*="sidebar"]') || element.parentElement);
            }
        });

        // Method 2: Use MutationObserver as backup to detect when sidebar loads
        const observer = new MutationObserver((mutations, obs) => {
            // Look for "Document tabs" text in the DOM
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim() === 'Document tabs') {
                    // Found it - get the section container
                    let section = node.parentElement;
                    // Walk up to find the section container
                    for (let i = 0; i < 10 && section; i++) {
                        if (section.nextElementSibling || section.previousElementSibling) {
                            // This might be the right level
                            if (section.querySelector('[role="tree"], [role="button"]')) {
                                createLabelsSection(section);
                                obs.disconnect();
                                return;
                            }
                        }
                        section = section.parentElement;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Stop observing after 30 seconds to prevent memory issues
        setTimeout(() => observer.disconnect(), 30000);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
