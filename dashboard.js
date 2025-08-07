// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    
    // Handle close button
    const closeBtn = document.getElementById('close-dashboard');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('Close button clicked');
            window.close();
        });
    }
    
    // Handle Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            console.log('Escape key pressed');
            window.close();
        }
    });
    
    // Initialize dashboard data (you can fetch real data here)
    initializeDashboard();
});

function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Add animation to stats cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.3s ease';
            
            requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        }, index * 100);
    });
    
    // Add animation to charts
    const chartCards = document.querySelectorAll('.chart-card');
    chartCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateX(-20px)';
            card.style.transition = 'all 0.3s ease';
            
            requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
            });
        }, (statCards.length + index) * 100);
    });
    
    // Add animation to activity items
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            item.style.transition = 'all 0.3s ease';
            
            requestAnimationFrame(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            });
        }, (statCards.length + chartCards.length + index) * 100);
    });
}

// Function to load real data (you can implement this later)
async function loadDashboardData() {
    try {
        // Example: Fetch data from your API
        // const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/dashboard/data`);
        // const data = await response.json();
        // updateDashboardWithData(data);
        
        console.log('Dashboard data loading would go here');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Function to update dashboard with real data
function updateDashboardWithData(data) {
    // Update stats
    // Update charts
    // Update recent activity
    console.log('Dashboard data update would go here', data);
}
