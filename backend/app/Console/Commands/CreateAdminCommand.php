<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:admin
                            {--name= : Full name of the administrator}
                            {--email= : Unique email address for the administrator}
                            {--phone= : Contact phone number}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Interactively create a platform administrator account for production deployment';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('====================================================');
        $this->info('  Dessie Marketplace - Production Admin Provisioning ');
        $this->info('====================================================');

        // 1. Collect Name
        $name = $this->option('name') ?: $this->ask('Enter Administrator Full Name', 'Platform Admin');

        // 2. Collect and Validate Email
        $email = $this->option('email') ?: $this->ask('Enter Administrator Email Address');
        $emailValidator = Validator::make(['email' => $email], [
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        ]);

        if ($emailValidator->fails()) {
            $this->error('Validation error: ' . $emailValidator->errors()->first('email'));
            return Command::FAILURE;
        }

        // 3. Collect Phone
        $phone = $this->option('phone') ?: $this->ask('Enter Administrator Phone Number (e.g. +251911000001)');
        if (! $phone) {
            $this->error('Phone number is required.');
            return Command::FAILURE;
        }

        // 4. Secure Masked Password Collection (Never stored in shell history)
        $password = $this->secret('Enter Administrator Password (minimum 8 characters)');
        if (! $password || strlen($password) < 8) {
            $this->error('Password must be at least 8 characters in length.');
            return Command::FAILURE;
        }

        $passwordConfirmation = $this->secret('Confirm Administrator Password');
        if ($password !== $passwordConfirmation) {
            $this->error('Passwords do not match. Aborting.');
            return Command::FAILURE;
        }

        // 5. Create Administrator Record
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'role' => 'admin',
            'password' => Hash::make($password),
        ]);

        $this->newLine();
        $this->info(" Administrator successfully created (ID: {$user->id})");
        $this->table(
            ['Field', 'Value'],
            [
                ['Name', $user->name],
                ['Email', $user->email],
                ['Phone', $user->phone],
                ['Role', $user->role],
                ['Created At', $user->created_at->toIso8601String()],
            ]
        );

        $this->comment('Reminder: The administrator password has been securely hashed with bcrypt.');
        return Command::SUCCESS;
    }
}

