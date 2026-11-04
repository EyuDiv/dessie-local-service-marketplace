<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->isProduction()) {
            User::firstOrCreate(
                ['email' => env('LOCAL_ADMIN_EMAIL', 'admin@dessie.local')],
                [
                    'name' => 'Dessie Platform Admin',
                    'phone' => env('LOCAL_ADMIN_PHONE', '+251911000001'),
                    'role' => 'admin',
                    'password' => \Illuminate\Support\Facades\Hash::make(env('LOCAL_ADMIN_PASSWORD', 'DessieAdmin2026!Secure')),
                ]
            );

            $this->call(DemoProviderSeeder::class);
        }
    }
}
