document.addEventListener('DOMContentLoaded', () => {
    const editProfileBtn = document.getElementById('edit-profile');
    const updateDetailsBtn = document.getElementById('update-details');
    const closePopupBtn = document.getElementById('close-popup');
    const emailField = document.getElementById('edit-email');
    const ageField = document.getElementById('edit-age');
    const collegeField = document.getElementById('edit-college');
    const bioField = document.getElementById('edit-bio');
    const editPopup = document.getElementById('edit-popup');
    const moonIcon = document.getElementById('moonIcon');

    // Prefill popup fields
    editProfileBtn.addEventListener('click', () => {
        emailField.value = document.getElementById('email').textContent;
        ageField.value = document.getElementById('age').textContent;
        collegeField.value = document.getElementById('college').textContent;
        bioField.value = document.getElementById('bio').textContent;

        editPopup.classList.add('show');
    });

    closePopupBtn.addEventListener('click', () => {
        editPopup.classList.remove('show'); // Hide popup
    });
    

    // Update user details
    updateDetailsBtn.addEventListener('click', async () => {
        const updatedDetails = {
            email: emailField.value,
            age: ageField.value,
            college: collegeField.value,
            bio: bioField.value,
        };
        alert("IF u have loged in then only ur Updated Details is stored in database..")
        

        try {
            const response = await fetch('/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedDetails),
            });

            if (response.ok) {
                document.getElementById('email').textContent = updatedDetails.email;
                document.getElementById('age').textContent = updatedDetails.age;
                document.getElementById('college').textContent = updatedDetails.college;
                document.getElementById('bio').textContent = updatedDetails.bio;

                editPopup.classList.remove('show');
            } else {
                alert('Failed to update details. Try again.');
            }
        } catch (err) {
            alert('Error updating profile. Please try again.');
        }
    });

    // Toggle dark mode
    moonIcon.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });
});


document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch user details
        const response = await fetch('/get-user-details');
        const user = await response.json();

        if (response.ok) {
            // Populate user details into the profile page
            document.getElementById('username').textContent = user.username;
            document.getElementById('email').textContent = user.email;
            document.getElementById('age').textContent = user.age;
            document.getElementById('college').textContent = user.college;
            document.getElementById('bio').textContent = user.bio;
        } else {
            alert('Failed to fetch user details. Please log in again.');
        }
    } catch (err) {
        console.error('Error fetching user details:', err);
        alert('Error fetching user details. Please try again.');
    }

    // Edit profile logic remains the same
    const editProfileBtn = document.getElementById('edit-profile');
    const updateDetailsBtn = document.getElementById('update-details');
    const emailField = document.getElementById('edit-email');
    const ageField = document.getElementById('edit-age');
    const collegeField = document.getElementById('edit-college');
    const bioField = document.getElementById('edit-bio');
    const editPopup = document.getElementById('edit-popup');

    // Prefill popup fields with current values
    editProfileBtn.addEventListener('click', () => {
        emailField.value = document.getElementById('email').textContent;
        ageField.value = document.getElementById('age').textContent;
        collegeField.value = document.getElementById('college').textContent;
        bioField.value = document.getElementById('bio').textContent;

        editPopup.classList.remove('hidden');
    });

    // Update user details
    updateDetailsBtn.addEventListener('click', async () => {
        const updatedDetails = {
            email: emailField.value,
            age: ageField.value,
            college: collegeField.value,
            bio: bioField.value,
        };

        try {
            const response = await fetch('/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedDetails),
            });

            if (response.ok) {
                // Update UI with the new details
                document.getElementById('email').textContent = updatedDetails.email;
                document.getElementById('age').textContent = updatedDetails.age;
                document.getElementById('college').textContent = updatedDetails.college;
                document.getElementById('bio').textContent = updatedDetails.bio;

                // Hide popup
                editPopup.classList.add('hidden');
            } else {
                alert('Failed to update details. Please try again.');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update details. Please try again.');
        }
    });
});