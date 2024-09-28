document.addEventListener('DOMContentLoaded', function() {
    const taskForms = document.querySelectorAll('.task-form');
    const taskLists = document.querySelectorAll('.task-list');
    const timeframeSelect = document.getElementById('timeframe-select');
    const exportBtn = document.getElementById('export-btn');
    let chart;

    fetchTasks();
    initChart();

    taskForms.forEach(form => {
        form.addEventListener('submit', addTask);
    });

    timeframeSelect.addEventListener('change', updateProgress);

    if (exportBtn) {
        console.log('Export button found');
        exportBtn.addEventListener('click', exportData);
    } else {
        console.error('Export button not found');
    }

    function fetchTasks() {
        fetch('/tasks')
            .then(response => response.json())
            .then(tasks => {
                const gTasks = tasks.filter(task => task.user_id === 1);
                const aTasks = tasks.filter(task => task.user_id === 2);
                renderTasks(gTasks, taskLists[0]);
                renderTasks(aTasks, taskLists[1]);
            });
    }

    function renderTasks(tasks, taskList) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <span class="task-content ${task.completed ? 'task-completed' : ''}">${task.content}</span>
                <button class="btn btn-primary toggle-task" data-id="${task.id}">${task.completed ? 'Undo' : 'Complete'}</button>
                <button class="btn btn-danger delete-task" data-id="${task.id}">Delete</button>
            `;
            taskList.appendChild(li);
        });
        addTaskEventListeners();
    }

    function addTask(e) {
        e.preventDefault();
        const form = e.target;
        const input = form.querySelector('input[type="text"]');
        const userId = form.dataset.userId;

        fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: input.value,
                user_id: userId
            }),
        })
        .then(response => response.json())
        .then(newTask => {
            const taskList = form.nextElementSibling;
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <span class="task-content">${newTask.content}</span>
                <button class="btn btn-primary toggle-task" data-id="${newTask.id}">Complete</button>
                <button class="btn btn-danger delete-task" data-id="${newTask.id}">Delete</button>
            `;
            taskList.appendChild(li);
            input.value = '';
            addTaskEventListeners();
            updateProgress();
        });
    }

    function addTaskEventListeners() {
        document.querySelectorAll('.toggle-task').forEach(btn => {
            btn.addEventListener('click', toggleTask);
        });
        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', deleteTask);
        });
    }

    function toggleTask(e) {
        const taskId = e.target.dataset.id;
        const taskContent = e.target.previousElementSibling;
        const completed = !taskContent.classList.contains('task-completed');

        fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed }),
        })
        .then(response => response.json())
        .then(updatedTask => {
            taskContent.classList.toggle('task-completed');
            e.target.textContent = completed ? 'Undo' : 'Complete';
            updateProgress();
        });
    }

    function deleteTask(e) {
        const taskId = e.target.dataset.id;
        fetch(`/tasks/${taskId}`, {
            method: 'DELETE',
        })
        .then(() => {
            e.target.closest('.task-item').remove();
            updateProgress();
        });
    }

    function initChart() {
        const ctx = document.getElementById('progress-chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['G', 'A'],
                datasets: [{
                    label: 'Completion Percentage',
                    data: [0, 0],
                    backgroundColor: ['rgba(72, 187, 120, 0.8)', 'rgba(66, 153, 225, 0.8)'],
                    borderColor: ['rgb(72, 187, 120)', 'rgb(66, 153, 225)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toFixed(2) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    function updateProgress() {
        const timeframe = timeframeSelect.value;
        fetch(`/progress?timeframe=${timeframe}`)
            .then(response => response.json())
            .then(data => {
                const gProgress = data.find(p => p.name === 'G') || { completion_percentage: 0, completed_tasks: 0, total_tasks: 0 };
                const aProgress = data.find(p => p.name === 'A') || { completion_percentage: 0, completed_tasks: 0, total_tasks: 0 };
                
                chart.data.datasets[0].data = [gProgress.completion_percentage, aProgress.completion_percentage];
                chart.data.datasets[0].label = `Completion Percentage (Last ${timeframe} days)`;
                chart.update();

                document.getElementById('g-progress').textContent = `${gProgress.completion_percentage.toFixed(2)}% (${gProgress.completed_tasks}/${gProgress.total_tasks})`;
                document.getElementById('a-progress').textContent = `${aProgress.completion_percentage.toFixed(2)}% (${aProgress.completed_tasks}/${aProgress.total_tasks})`;
            });
    }

    function exportData() {
        console.log('Export function called');
        const timeframe = timeframeSelect.value;
        console.log('Selected timeframe:', timeframe);
        fetch(`/export?timeframe=${timeframe}`)
            .then(response => {
                console.log('Export response received');
                return response.json();
            })
            .then(data => {
                console.log('Export data received:', data);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `daily_quest_export_${timeframe}days.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('Export completed');
            })
            .catch(error => {
                console.error('Export error:', error);
            });
    }
});
