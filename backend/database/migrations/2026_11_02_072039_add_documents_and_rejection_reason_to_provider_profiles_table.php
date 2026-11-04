<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->string('cv_path')->nullable()->after('verification_status');
            $table->string('cv_original_name')->nullable()->after('cv_path');
            $table->string('certificate_path')->nullable()->after('cv_original_name');
            $table->string('certificate_original_name')->nullable()->after('certificate_path');
            $table->text('rejection_reason')->nullable()->after('certificate_original_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'cv_path',
                'cv_original_name',
                'certificate_path',
                'certificate_original_name',
                'rejection_reason',
            ]);
        });
    }
};
