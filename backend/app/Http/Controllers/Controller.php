<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Return a clear 422 response when an uploaded file exceeds PHP's server-level size limit.
     *
     * @param  list<string>  $fields
     */
    protected function checkPhpUploadLimit(Request $request, array $fields): ?JsonResponse
    {
        foreach ($fields as $field) {
            $file = $request->file($field);
            if (! $file || $file->isValid()) {
                continue;
            }

            $errorCode = $file->getError();
            if ($errorCode === UPLOAD_ERR_INI_SIZE || $errorCode === UPLOAD_ERR_FORM_SIZE) {
                $limit = ini_get('upload_max_filesize') ?: '2M';
                $msg = "The {$field} file exceeds the server upload limit ({$limit}). Please choose a smaller file under {$limit}.";

                return response()->json([
                    'message' => $msg,
                    'errors' => [
                        $field => [$msg],
                    ],
                ], 422);
            }
        }

        return null;
    }
}
